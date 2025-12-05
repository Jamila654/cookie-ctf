const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());
app.use(express.static('public'));

function rot13(str) {
  return str.replace(/[a-zA-Z]/g, (c) =>
    String.fromCharCode(
      (c <= 'Z' ? 90 : 122) >=
      (c = c.charCodeAt(0) + 13)
        ? c
        : c - 26
    )
  );
}

function tripleEncode(obj) {
  const urlEncoded = encodeURIComponent(JSON.stringify(obj));
  const b64 = Buffer.from(urlEncoded).toString("base64");
  return rot13(b64);
}
function tripleDecode(str) {
  try {
    const b64 = rot13(str);
    const urlDecoded = Buffer.from(b64, "base64").toString();
    return JSON.parse(decodeURIComponent(urlDecoded));
  } catch (e) {
    return {};
  }
}

const FAKE_HMAC_SECRET = "verified_by_server";       
const HMAC_FIELD = rot13(FAKE_HMAC_SECRET);     

app.get('/', (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/login", (req, res) => {
  const payload = {
    role: "guest",
    uid: 1337,
    exp: Date.now() + 3600000,
  };

  const token = tripleEncode(payload);

  const signature = HMAC_FIELD;

  res.cookie("session", `${token}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 3600000,
  });

  return res.redirect("/dashboard");
});


app.get("/dashboard", (req, res) => {
  const session = req.cookies.session || "";
  const [token, sig] = session.split(".");

  if (!token || sig !== HMAC_FIELD) {
    return res.status(403).send(`
      <h1 style="color:red;text-align:center;margin-top:20%">Invalid Session</h1>
      <p style="text-align:center"><a href="/">Back</a></p>
    `);
  }

  const user = tripleDecode(token);

  if (user.role === "admin" && user.uid === 1) {
    return res.send(`
      <!DOCTYPE html><html><body>
      <div style="text-align:center;margin-top:10%">
        <h1 style="font-size:48px;color:green">Admin Panel</h1>
        <p style="font-size:22px">Welcome root user</p>
        <h2 style="background:#e8ffe8;padding:20px;border:3px solid #7ec77e;display:inline-block;font-size:24px">
          CTF{tr1pl3_enc0d1ng_13nt_r34l_s3cur1ty}
        </h2>
      </div>
      </body></html>
    `);
  }

  return res.send(`
    <!DOCTYPE html><html><body>
    <div style="text-align:center;margin-top:20%">
      <h1 style="font-size:32px">Guest Dashboard</h1>
      <p>User ID: ${user.uid}</p>
      <p style="color:red;margin-top:20px;font-weight:bold">Admin Access Denied</p>
      <p><a href="/">Back</a></p>
    </div></body></html>
  `);
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`SecureBank CTF running → http://localhost:${port}`)
);
