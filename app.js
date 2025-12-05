const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());
app.use(express.static('public'));

function obfuscate(data) {
  return encodeURIComponent(
    Buffer.from(encodeURIComponent(JSON.stringify(data))).toString('base64')
  );
}

function deobfuscate(str) {
  try {
    return JSON.parse(
      decodeURIComponent(
        Buffer.from(decodeURIComponent(str), 'base64').toString()
      )
    );
  } catch (e) {
    return {};
  }
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/login', (req, res) => {
  const payload = {
    role: "guest",
    uid: 1337,
    exp: Date.now() + 3600000
  };

  const token = obfuscate(payload);
  const signature = Buffer.from("verified_by_server").toString('base64');

  res.cookie('session', `${token}.${signature}`, {
    httpOnly: true,
    secure: false,      
    sameSite: 'lax',
    maxAge: 3600000
  });

  res.redirect('/dashboard');
});


app.get('/dashboard', (req, res) => {
  const cookie = req.cookies.session || "";
  const parts = cookie.split('.');

  if (parts.length !== 2 || parts[1] !== Buffer.from("verified_by_server").toString('base64')) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html class="h-full bg-gray-50"><head><meta charset="UTF-8"><title>Invalid</title>
      <script src="https://cdn.tailwindcss.com"></script></head>
      <body class="h-full flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-red-600">Invalid Session</h1>
          <a href="/" class="mt-4 text-indigo-600 hover:underline">← Back</a>
        </div>
      </body></html>
    `);
  }

  const user = deobfuscate(parts[0]);

  if (user.role === 'admin' && user.uid === 1) {
    res.send(`
      <!DOCTYPE html>
      <html class="h-full bg-gray-50">
      <head>
        <meta charset="UTF-8"><title>Admin • SecureBank</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>body{font-family:'Inter',sans-serif;}</style>
      </head>
      <body class="h-full flex items-center justify-center p-6">
        <div class="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border p-12 text-center">
          <h1 class="text-5xl font-bold text-green-700 mb-4">Admin Panel</h1>
          <p class="text-xl text-gray-700 mb-10">Welcome back, root user</p>
          <div class="p-8 bg-green-50 border-4 border-green-300 rounded-xl">
            <code class="text-2xl md:text-3xl font-mono text-green-800 break-all">
              CTF{d0ubl3_3nc0d3d_c00k13s_4r3_st1ll_tru5t3d}
            </code>
          </div>
          <div class="mt-10">
            <a href="/" class="text-indigo-600 hover:underline">← Logout</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html class="h-full bg-gray-50">
      <head><meta charset="UTF-8"><title>Dashboard • SecureBank</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
      <style>body{font-family:'Inter',sans-serif;}</style>
      </head>
      <body class="h-full flex items-center justify-center p-6">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border p-10 text-center">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Guest Dashboard</h1>
          <p class="text-lg text-gray-600">User ID: ${user.uid || 'unknown'}</p>
          <p class="mt-10 text-red-600 font-semibold text-xl">Admin access denied</p>
          <div class="mt-8">
            <a href="/" class="text-indigo-600 hover:underline">← Back to login</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`SecureBank CTF running → http://localhost:${port}`);
});