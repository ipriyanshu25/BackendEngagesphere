require('dotenv').config();
const axios = require('axios');
const Payment = require('../model/payment');
const User = require('../model/user');

const PAYPAL_API =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const getCredentials = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  return { id: clientId, secret };
};

const getAccessToken = async () => {
  const { id, secret } = getCredentials();
  const creds = Buffer.from(`${id}:${secret}`, 'utf8').toString('base64');
  const { data } = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return data.access_token;
};

/** Create PayPal order and save initial Payment, returning approval link */
exports.createOrder = async (req, res) => {
  const { amount, packageName, packageFeatures = [], userId } = req.body;
  try {
    const user = await User.findOne({ userId });
    if (!user) return res.status(400).json({ error: 'Invalid userId' });
    const userName = user.name || user.username;

    const accessToken = await getAccessToken();
    const { data: order } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: 'USD', value: amount },
            description: `${packageName} – EngageSphere Package`,
            custom_id: `pkg_${Date.now()}`,
          },
        ],
        application_context: {
          brand_name: 'EngageSphere',
          user_action: 'PAY_NOW',
          return_url:
            process.env.NODE_ENV === 'production'
              ? 'https://yourdomain.com/success'
              : 'http://localhost:3000/success',
          cancel_url:
            process.env.NODE_ENV === 'production'
              ? 'https://yourdomain.com/cancel'
              : 'http://localhost:3000/cancel',
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    // Extract approval link for frontend redirection
    const approveLink = order.links.find((l) => l.rel === 'approve')?.href || '';

    const payment = await Payment.create({
      orderId: order.id,
      userId,
      userName,
      status: 'CREATED',
      packageName,
      packageFeatures,
      amount: parseFloat(amount),
      currency: 'USD',
      create_time: new Date(),
    });

    res.status(200).json({ payment, approveLink });
  } catch (err) {
    console.error('PayPal createOrder error:', err);
    res.status(500).json({ error: 'Order creation failed' });
  }
};

/** Capture PayPal order, fetch PayPal transaction and update Payment */
exports.captureOrder = async (req, res) => {
  const orderId = req.body.orderID || req.body.orderId;
  if (!orderId) return res.status(400).json({ error: 'orderId (or orderID) is required' });
  try {
    const accessToken = await getAccessToken();
    const { data: captureRes } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    const payer = captureRes.payer;
    const txn = captureRes.purchase_units[0].payments.captures[0];

    const payment = await Payment.findOneAndUpdate(
      { orderId: captureRes.id },
      {
        transactionId: txn.id,
        status: txn.status,
        payerEmail: payer.email_address,
        payerName: `${payer.name.given_name} ${payer.name.surname}`,
        create_time: txn.create_time,
      },
      { new: true }
    );

    res.status(200).json({ message: 'Payment captured & updated', payment });
  } catch (err) {
    if (err.response && err.response.status === 422) {
      console.error('PayPal capture validation error:', err.response.data);
      return res.status(400).json({
        error: 'Order cannot be captured. Ensure it is approved by the buyer.',
        details: err.response.data,
      });
    }
    console.error('PayPal captureOrder error:', err);
    res.status(500).json({ error: 'Payment capture failed' });
  }
};

/** Get payment by paymentId */
exports.getPaymentDetails = async (req, res) => {
  const { paymentId } = req.body;
  try {
    const payment = await Payment.findOne({ paymentId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.status(200).json({ payment });
  } catch (err) {
    console.error('PayPal getPaymentDetails error:', err);
    res.status(500).json({ error: 'Could not retrieve payment details' });
  }
};
