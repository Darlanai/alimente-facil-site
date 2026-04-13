require('dotenv').config();
const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const PREMIUM_CHECKOUT_URL =
  process.env.MP_PREMIUM_CHECKOUT_URL ||
  'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=ae9349b69ef94a27ad19786352488fa5';
const TRIAL_DAYS = 7;

let mongoClient = null;
let db = null;
let connectPromise = null;

function now() {
  return new Date();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name || '',
    email: user.email || '',
    createdAt: user.createdAt || null
  };
}

function defaultAppState() {
  return {
    listas: [],
    despensa: [],
    receitas: [],
    planejador: { notes: '' }
  };
}

function usersCollection() {
  return db.collection('users');
}

function subscriptionsCollection() {
  return db.collection('subscriptions');
}

function appStateCollection() {
  return db.collection('app_state');
}

function contactMessagesCollection() {
  return db.collection('contact_messages');
}

function signAuthToken(user) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET não configurado.');
  return jwt.sign({ sub: String(user._id), email: user.email, typ: 'auth' }, JWT_SECRET, { expiresIn: '7d' });
}

async function ensureIndexes() {
  await usersCollection().createIndex({ email: 1 }, { unique: true });
  await subscriptionsCollection().createIndex({ userId: 1 }, { unique: true });
  await appStateCollection().createIndex({ userId: 1 }, { unique: true });
  await contactMessagesCollection().createIndex({ createdAt: -1 });
}

async function connectToMongo() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI não configurada.');
  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  db = mongoClient.db('alimente_facil');
  await ensureIndexes();
  return db;
}

async function ensureMongoConnection() {
  if (db) return db;
  if (!connectPromise) {
    connectPromise = connectToMongo().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }
  return connectPromise;
}

function authMiddleware(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ ok: false, message: 'Token ausente.' });
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.typ !== 'auth') return res.status(401).json({ ok: false, message: 'Token inválido.' });
    req.auth = payload;
    next();
  } catch (_error) {
    return res.status(401).json({ ok: false, message: 'Token inválido ou expirado.' });
  }
}

async function getUserSubscription(userId) {
  await ensureMongoConnection();
  return subscriptionsCollection().findOne({ userId: new ObjectId(String(userId)) });
}

async function ensureUserSubscription(userId) {
  let subscription = await getUserSubscription(userId);
  if (subscription) return subscription;
  const createdAt = now();
  const userObjectId = new ObjectId(String(userId));
  await subscriptionsCollection().insertOne({
    userId: userObjectId,
    plan: 'basic',
    status: 'basic',
    trialStart: null,
    trialEnd: null,
    mercadopagoPreapprovalPlanId: 'ae9349b69ef94a27ad19786352488fa5',
    mercadopagoSubscriptionId: null,
    lastPaymentAt: null,
    blockedAt: null,
    createdAt,
    updatedAt: createdAt
  });
  return getUserSubscription(userObjectId);
}

async function ensureUserAppState(userId) {
  await ensureMongoConnection();
  const userObjectId = new ObjectId(String(userId));
  let state = await appStateCollection().findOne({ userId: userObjectId });
  if (state) return state;
  const createdAt = now();
  const payload = {
    userId: userObjectId,
    ...defaultAppState(),
    createdAt,
    updatedAt: createdAt
  };
  await appStateCollection().insertOne(payload);
  return appStateCollection().findOne({ userId: userObjectId });
}

async function normalizeSubscriptionState(subscription) {
  if (!subscription) return null;
  const currentDate = now();
  const hasMercadoPagoProof = Boolean(subscription.mercadopagoSubscriptionId || subscription.lastPaymentAt);

  if (subscription.plan === 'premium' && subscription.status === 'trialing' && subscription.trialEnd && currentDate > new Date(subscription.trialEnd)) {
    const nextStatus = hasMercadoPagoProof ? 'active' : 'basic';
    const nextPlan = hasMercadoPagoProof ? 'premium' : 'basic';
    await subscriptionsCollection().updateOne(
      { _id: subscription._id },
      {
        $set: {
          plan: nextPlan,
          status: nextStatus,
          blockedAt: hasMercadoPagoProof ? null : currentDate,
          updatedAt: currentDate
        }
      }
    );
    subscription.plan = nextPlan;
    subscription.status = nextStatus;
    subscription.blockedAt = hasMercadoPagoProof ? null : currentDate;
    subscription.updatedAt = currentDate;
  }

  if (!subscription.plan || !subscription.status) {
    await subscriptionsCollection().updateOne(
      { _id: subscription._id },
      { $set: { plan: 'basic', status: 'basic', updatedAt: currentDate } }
    );
    subscription.plan = 'basic';
    subscription.status = 'basic';
  }

  return subscription;
}

function publicSubscription(subscription) {
  if (!subscription) return null;
  return {
    id: String(subscription._id),
    userId: String(subscription.userId),
    plan: subscription.plan,
    status: subscription.status,
    trialStart: subscription.trialStart || null,
    trialEnd: subscription.trialEnd || null,
    lastPaymentAt: subscription.lastPaymentAt || null,
    blockedAt: subscription.blockedAt || null,
    mercadopagoSubscriptionId: subscription.mercadopagoSubscriptionId || null,
    checkoutUrl: PREMIUM_CHECKOUT_URL
  };
}

function getAccessDecision(subscription) {
  if (!subscription) {
    return {
      allowed: true,
      readOnly: true,
      plan: 'basic',
      reason: 'basic',
      message: 'Plano básico ativo. Navegação visual liberada.'
    };
  }

  if (subscription.plan === 'premium' && ['active', 'trialing'].includes(subscription.status)) {
    return {
      allowed: true,
      readOnly: false,
      plan: 'premium',
      reason: subscription.status,
      message: 'Premium liberado.'
    };
  }

  return {
    allowed: true,
    readOnly: true,
    plan: 'basic',
    reason: subscription.status || 'basic',
    message: 'Plano básico ativo. Você pode visualizar as abas, mas toda ação exige Premium.'
  };
}

async function buildSessionPayload(user) {
  let subscription = await ensureUserSubscription(user._id);
  subscription = await normalizeSubscriptionState(subscription);
  await ensureUserAppState(user._id);
  const access = getAccessDecision(subscription);
  return {
    user: sanitizeUser(user),
    subscription: publicSubscription(subscription),
    access
  };
}

function sanitizeIncomingAppState(payload) {
  const safe = defaultAppState();
  safe.listas = Array.isArray(payload?.listas)
    ? payload.listas.slice(0, 100).map((item, index) => ({
        id: String(item?.id || `${Date.now()}-${index}`),
        title: String(item?.title || '').trim().slice(0, 120),
        notes: String(item?.notes || '').trim().slice(0, 4000),
        createdAt: item?.createdAt || new Date().toISOString()
      })).filter((item) => item.title)
    : [];

  safe.despensa = Array.isArray(payload?.despensa)
    ? payload.despensa.slice(0, 200).map((item, index) => ({
        id: String(item?.id || `${Date.now()}-${index}`),
        name: String(item?.name || '').trim().slice(0, 120),
        quantity: String(item?.quantity || '').trim().slice(0, 60),
        expiry: String(item?.expiry || '').trim().slice(0, 40),
        createdAt: item?.createdAt || new Date().toISOString()
      })).filter((item) => item.name)
    : [];

  safe.receitas = Array.isArray(payload?.receitas)
    ? payload.receitas.slice(0, 100).map((item, index) => ({
        id: String(item?.id || `${Date.now()}-${index}`),
        title: String(item?.title || '').trim().slice(0, 120),
        ingredients: String(item?.ingredients || '').trim().slice(0, 4000),
        method: String(item?.method || '').trim().slice(0, 6000),
        createdAt: item?.createdAt || new Date().toISOString()
      })).filter((item) => item.title)
    : [];

  safe.planejador = {
    notes: String(payload?.planejador?.notes || '').trim().slice(0, 6000)
  };

  return safe;
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', async (_req, res) => {
  try {
    await ensureMongoConnection();
    res.json({
      ok: true,
      hasMongoUri: Boolean(MONGODB_URI),
      hasJwtSecret: Boolean(JWT_SECRET),
      mongoConnected: Boolean(db)
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, mongoConnected: false });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    await ensureMongoConnection();
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    const existingUser = await usersCollection().findOne({ email });
    if (existingUser) {
      return res.status(409).json({ ok: false, message: 'Já existe uma conta com esse e-mail.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = now();
    const userResult = await usersCollection().insertOne({
      name,
      email,
      passwordHash,
      createdAt,
      updatedAt: createdAt
    });

    const userId = userResult.insertedId;
    await subscriptionsCollection().insertOne({
      userId,
      plan: 'basic',
      status: 'basic',
      trialStart: null,
      trialEnd: null,
      mercadopagoPreapprovalPlanId: 'ae9349b69ef94a27ad19786352488fa5',
      mercadopagoSubscriptionId: null,
      lastPaymentAt: null,
      blockedAt: null,
      createdAt,
      updatedAt: createdAt
    });
    await appStateCollection().insertOne({
      userId,
      ...defaultAppState(),
      createdAt,
      updatedAt: createdAt
    });

    const user = await usersCollection().findOne({ _id: userId });
    const session = await buildSessionPayload(user);

    return res.status(201).json({
      ok: true,
      message: 'Conta criada com sucesso. Seu acesso inicial é básico e visual.',
      token: signAuthToken(user),
      ...session
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Não foi possível concluir o cadastro agora.', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    await ensureMongoConnection();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'E-mail e senha são obrigatórios.' });
    }

    const user = await usersCollection().findOne({ email });
    if (!user) return res.status(401).json({ ok: false, message: 'E-mail ou senha inválidos.' });

    const passwordOk = await bcrypt.compare(password, user.passwordHash || '');
    if (!passwordOk) return res.status(401).json({ ok: false, message: 'E-mail ou senha inválidos.' });

    const session = await buildSessionPayload(user);
    return res.json({ ok: true, message: 'Login realizado com sucesso.', token: signAuthToken(user), ...session });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Não foi possível fazer login agora.', error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    await ensureMongoConnection();
    const user = await usersCollection().findOne({ _id: new ObjectId(req.auth.sub) });
    if (!user) return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' });
    const session = await buildSessionPayload(user);
    return res.json({ ok: true, ...session });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Não foi possível carregar sua sessão.', error: error.message });
  }
});

app.get('/api/access-status', authMiddleware, async (req, res) => {
  try {
    await ensureMongoConnection();
    const user = await usersCollection().findOne({ _id: new ObjectId(req.auth.sub) });
    if (!user) return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' });
    const session = await buildSessionPayload(user);
    return res.json({ ok: true, access: session.access, subscription: session.subscription, checkoutUrl: PREMIUM_CHECKOUT_URL });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Não foi possível verificar o acesso.', error: error.message });
  }
});

app.get('/api/app-state', authMiddleware, async (req, res) => {
  try {
    await ensureMongoConnection();
    const userId = new ObjectId(req.auth.sub);
    const user = await usersCollection().findOne({ _id: userId });
    if (!user) return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' });
    const session = await buildSessionPayload(user);
    const stateDoc = await ensureUserAppState(userId);
    return res.json({
      ok: true,
      access: session.access,
      subscription: session.subscription,
      data: {
        listas: stateDoc.listas || [],
        despensa: stateDoc.despensa || [],
        receitas: stateDoc.receitas || [],
        planejador: stateDoc.planejador || { notes: '' }
      }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Não foi possível carregar os dados do painel.', error: error.message });
  }
});

app.put('/api/app-state', authMiddleware, async (req, res) => {
  try {
    await ensureMongoConnection();
    const userId = new ObjectId(req.auth.sub);
    const user = await usersCollection().findOne({ _id: userId });
    if (!user) return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' });
    const session = await buildSessionPayload(user);
    if (session.access.readOnly) {
      return res.status(403).json({ ok: false, requiresPayment: true, message: 'Plano básico não pode alterar dados.' });
    }
    const safeState = sanitizeIncomingAppState(req.body?.data || {});
    const updatedAt = now();
    await appStateCollection().updateOne(
      { userId },
      {
        $set: {
          listas: safeState.listas,
          despensa: safeState.despensa,
          receitas: safeState.receitas,
          planejador: safeState.planejador,
          updatedAt
        }
      },
      { upsert: true }
    );
    return res.json({ ok: true, message: 'Dados salvos com sucesso.', data: safeState, access: session.access, subscription: session.subscription });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Não foi possível salvar os dados.', error: error.message });
  }
});

app.get('/api/billing/checkout-link', (_req, res) => {
  return res.json({ ok: true, checkoutUrl: PREMIUM_CHECKOUT_URL });
});

app.post('/api/billing/confirm-premium', authMiddleware, async (req, res) => {
  try {
    await ensureMongoConnection();
    const userId = new ObjectId(req.auth.sub);
    const subscription = await ensureUserSubscription(userId);
    const currentDate = now();
    const trialStart = currentDate;
    const trialEnd = addDays(currentDate, TRIAL_DAYS);
    const mercadopagoSubscriptionId = String(req.body?.preapprovalId || req.body?.mercadopagoSubscriptionId || '').trim();

    if (!mercadopagoSubscriptionId) {
      return res.status(400).json({ ok: false, message: 'Identificador da assinatura do Mercado Pago não informado.' });
    }

    await subscriptionsCollection().updateOne(
      { _id: subscription._id },
      {
        $set: {
          plan: 'premium',
          status: 'trialing',
          trialStart,
          trialEnd,
          mercadopagoSubscriptionId,
          updatedAt: currentDate
        }
      }
    );

    const user = await usersCollection().findOne({ _id: userId });
    const session = await buildSessionPayload(user);
    return res.json({ ok: true, message: 'Premium ativado com 7 dias grátis.', ...session });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Não foi possível confirmar o Premium.', error: error.message });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    await ensureMongoConnection();
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const message = String(req.body?.message || '').trim();
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, message: 'Preencha nome, e-mail e mensagem.' });
    }
    await contactMessagesCollection().insertOne({ name, email, message, createdAt: now(), status: 'new' });
    return res.json({ ok: true, message: 'Mensagem recebida com sucesso.' });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Não foi possível enviar sua mensagem.', error: error.message });
  }
});

app.get('/termos.html', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'termos.html')));
app.get('/politica-de-privacidade.html', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'politica-de-privacidade.html')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

module.exports = app;

if (require.main === module) {
  ensureMongoConnection()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Alimente Fácil rodando em http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Erro ao conectar no MongoDB:', error.message);
      process.exit(1);
    });
}
