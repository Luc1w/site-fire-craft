const express = require('express');
const path = require('path');
const mercadopago = require('mercadopago');
const { Rcon } = require('rcon-client');

const app = express();
const PORT = 4000;

mercadopago.configure({
  access_token: 'APP_USR-948214061850317-040621-6856d556dfbadf51d685348e56800097-1469695485'
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/criar-preferencia', async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname) {
      return res.status(400).json({ error: 'Nickname obrigatório.' });
    }

    const preference = {
      items: [{
        title: `VIP para ${nickname}`,
        unit_price: 10.00,
        quantity: 1,
        currency_id: 'BRL'
      }],
      back_urls: {
        success: 'http://localhost:4000/success.html',
        failure: 'http://localhost:4000/failure.html',
        pending: 'http://localhost:4000/pending.html'
      },
      auto_return: 'approved',
      metadata: { nickname },
      notification_url: 'https://firecraftvip.loca.lt/webhook'
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.sandbox_init_point });
  } catch (err) {
    console.error('Erro ao criar preferência:', err);
    res.status(500).json({ error: 'Erro ao criar preferência.' });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== 'payment') return res.sendStatus(200);

    const payment = await mercadopago.payment.findById(data.id);
    if (payment.body.status === 'approved') {
      const nick = payment.body.metadata.nickname;
      console.log(`Pagamento aprovado para ${nick}, ativando VIP...`);

      const rcon = await Rcon.connect({
        host: '127.0.0.1',
        port: 25575,
        password: 'rconluc09082005minecraft'
      });

      await rcon.send(`lp user ${nick} parent set vip`);
      await rcon.send(`tell ${nick} Seu VIP foi ativado!`);
      await rcon.end();
    }
    res.sendStatus(200);
  } catch (e) {
    console.error('Erro no webhook:', e);
    res.sendStatus(500);
  }
});

app.post('/simular-pagamento', async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname) {
      return res.status(400).json({ error: 'Nickname obrigatório.' });
    }

    const rcon = await Rcon.connect({
      host: '127.0.0.1',
      port: 25575,
      password: 'rconluc09082005minecraft'
    });

    await rcon.send(`lp user ${nickname} parent set vip`);
    await rcon.send(`tell ${nickname} Seu VIP foi ativado (Simulado)!`);
    await rcon.end();

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro ao simular pagamento:', err);
    res.status(500).json({ error: 'Erro ao simular pagamento.' });
  }
});

app.get('/success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});
app.get('/failure.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'failure.html'));
});
app.get('/pending.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pending.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

