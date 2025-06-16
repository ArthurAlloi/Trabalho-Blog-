// Importa as bibliotecas necessárias para o projeto
const express = require("express"); // Framework para criar o servidor web
const session = require("express-session"); // Gerenciar sessões do usuário
const sqlite3 = require("sqlite3"); // Banco de dados SQLite
const xss = require("xss"); // Biblioteca para evitar ataques XSS

// Função para sanitizar entradas e evitar scripts maliciosos
function cleanData(userInput) {
  return xss(userInput);
}

// Inicializa a aplicação Express
const app = express();

// Define a porta onde o servidor irá rodar
const PORT = 8000;

// Cria/conecta ao banco de dados SQLite
const db = new sqlite3.Database("users.db");

// Cria as tabelas "users" e "posts" se não existirem
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, id_user INTEGER, title TEXT, content TEXT, data_criacao TEXT)"
  );
});

// Configura sessão para armazenar dados do usuário entre requisições
app.use(
  session({
    secret: "senhaforte", // Chave secreta da sessão
    resave: true,
    saveUninitialized: true,
  })
);

// Define pasta para arquivos estáticos (CSS, imagens, etc.)
app.use("/static", express.static(__dirname + "/static"));

// Middleware para permitir leitura de dados via POST (formulário)
app.use(express.urlencoded({ extended: true }));

// Define a engine de visualização como EJS (template engine)
app.set("view engine", "ejs");

// ===== ROTAS =====

// Página inicial
app.get("/", (req, res) => {
  console.log("GET /");
  res.render("pages/index", { titulo: "Index", req: req });
});

// Página "Sobre"
app.get("/sobre", (req, res) => {
  console.log("GET /sobre");
  res.render("pages/sobre", { titulo: "Sobre", req: req });
});

// Página de login
app.get("/login", (req, res) => {
  console.log("GET /login");
  res.render("pages/login", { titulo: "Login" });
});

// Processa login via formulário
app.post("/login", (req, res) => {
  console.log("POST /login");
  console.log(JSON.stringify(req.body));

  // Sanitiza entrada do usuário
  const username = cleanData(req.body.username);
  const password = cleanData(req.body.password);

  // Verifica credenciais no banco de dados
  const query = `SELECT * FROM users WHERE username=? AND password=?`;

  db.get(query, [username, password], (err, row) => {
    if (err) throw err;

    // Se usuário existe, define sessão e redireciona
    if (row) {
      req.session.username = username;
      req.session.loggedin = true;
      req.session.id_username = row.id;

      if (username == "admin") {
        req.session.adm = true;
        res.redirect("/dashboard");
      } else {
        req.session.adm = false;
        res.redirect("/");
      }
    } else {
      // Se não, redireciona para aviso de erro
      res.redirect("/user-senha-invalido");
    }
  });
});

// Página de erro de login
app.get("/user-senha-invalido", (req, res) => {
  res.render("pages/user-senha-invalido", {
    titulo: "Usuario Senha Invalidos",
  });
});

// Página de cadastro
app.get("/cadastro", (req, res) => {
  console.log("GET /cadastro");
  res.render("pages/cadastro", { titulo: "Cadastro" });
});

// Processa formulário de cadastro
app.post("/cadastro", (req, res) => {
  console.log("POST /cadastro");
  console.log(JSON.stringify(req.body));

  const username = cleanData(req.body.username);
  const password = cleanData(req.body.password);

  const query1 = `SELECT * FROM users WHERE username=?`; // Verifica se já existe
  const query2 = `INSERT INTO users (username, password) VALUES (?, ?)`; // Insere novo

  db.get(query1, [username], (err, row) => {
    if (err) throw err;

    if (row) {
      // Usuário já cadastrado
      res.redirect("/usuario-ja-cadastrado");
    } else {
      // Realiza o cadastro
      db.get(query2, [username, password], (err, row) => {
        if (err) throw err;
        res.redirect("/usuario-cadastrado");
      });
    }
  });
});

// Confirmação de cadastro realizado
app.get("/usuario-cadastrado", (req, res) => {
  res.render("pages/usuario-cadastrado", { titulo: "Usuario Cadastrado" });
});

// Aviso de que o usuário já existe
app.get("/usuario-ja-cadastrado", (req, res) => {
  res.render("pages/usuario-ja-cadastrado", {
    titulo: "Usuario Ja Cadastrado",
  });
});

// Painel do administrador
app.get("/dashboard", (req, res) => {
  console.log("GET /dashboard");

  if (req.session.adm) {
    // Apenas admins podem acessar
    const query = "SELECT * FROM users";
    db.all(query, [], (err, row) => {
      if (err) throw err;
      res.render("pages/dashboard", {
        titulo: "Dashboard",
        dados: row,
        req: req,
      });
    });
  } else {
    res.redirect("/nao-permitido");
  }
});

// Página para acesso não permitido (admin)
app.get("/nao-permitido", (req, res) => {
  console.log("GET /nao-permitido");
  res.render("pages/nao-permitido", { titulo: "Não Permitido" });
});

// Lista todos os posts
app.get("/posts/:pag", (req, res) => {
  console.log("GET /posts");
  const pag = req.params.pag;
  const query = "SELECT * FROM posts";
  db.all(query, [], (err, row) => {
    if (err) throw err;
    res.render("pages/posts", {
      titulo: "Posts",
      dados: row,
      req: req,
      pag: pag,
      contentInput: null,
    });
  });
});

// Busca posts pelo título
app.post("/posts/:pag", (req, res) => {
  console.log("POST /posts");
  const pag = req.params.pag;
  const { title } = req.body;

  let query = `SELECT * FROM posts Where title like '%${title}%'`;
  if (!title) query = `SELECT * FROM posts`;

  db.all(query, [], (err, row) => {
    if (err) throw err;
    res.render("pages/posts", {
      titulo: "Posts",
      dados: row,
      req: req,
      pag: pag,
      contentInput: title,
    });
  });
});

// Remove um post (admin)
app.get("/removerpost/:id", (req, res) => {
  if (req.session.adm) {
    const id = req.params.id;
    let query = "DELETE from posts Where id = ?";
    db.get(query, [id], (err, row) => {
      if (err) throw err;
      res.redirect("/posts/1");
    });
  } else {
    res.redirect("/nao-permitido");
  }
});

// Página para editar post (admin)
app.get("/editarPost/:id", (req, res) => {
  if (req.session.adm) {
    const id = req.params.id;
    let query = "Select * from posts Where id = ?";
    db.get(query, [id], (err, row) => {
      if (err) throw err;
      res.render("pages/editarPost", { dados: row, req: req, titulo: "Editar Post" });
    });
  } else {
    res.redirect("/nao-permitido");
  }
});

// Processa edição de post (admin)
app.post("/editarPost/:id", (req, res) => {
  console.log("POST /editarPost");
  if (req.session.adm) {
    const id = req.params.id;
    const { title, content } = req.body;
    const query = `UPDATE posts SET title= ?, content= ? WHERE id= ?`;

    if (!title || !content) {
      res.send("Preencha todos os campos para editar o Post");
    } else {
      db.all(query, [title, content, id], (err, row) => {
        if (err) throw err;
        res.redirect("/postCompleto/" + id);
      });
    }
  } else {
    res.redirect("/nao-autorizado");
  }
});

// Página para criar novo post (usuário logado)
app.get("/novo-post", (req, res) => {
  if (req.session.loggedin) {
    console.log("GET /novo-post");
    res.render("pages/novo-post", { titulo: "Nova Postagem", req: req });
  } else {
    res.redirect("/nao-autorizado");
  }
});

// Processa novo post (usuário logado)
app.post("/novo-post", (req, res) => {
  console.log("POST /novo-post");
  if (req.session.loggedin) {
    const title = cleanData(req.body.title);
    const content = cleanData(req.body.content);
    const query = `INSERT INTO posts (id_user, title, content, data_criacao) VALUES (?, ?, ?, ?)`;
    const data_atual = new Date().toLocaleDateString();

    if (!title || !content) {
      res.send("Preencha todos os campos para criar um novo Post");
    } else {
      db.get(query, [req.session.id_username, title, content, data_atual], (err, row) => {
        if (err) throw err;
        res.redirect("/posts/1");
      });
    }
  } else {
    res.redirect("/nao-autorizado");
  }
});

// Página para visualizar post completo
app.get("/postCompleto/:id", (req, res) => {
  console.log("GET /postCompleto");
  const postId = req.params.id;
  const query = `
    SELECT users.username, posts.id, title, content, data_criacao 
    FROM posts 
    INNER JOIN users ON posts.id_user = users.id 
    WHERE posts.id = ?`;

  db.all(query, [postId], (err, row) => {
    if (err) throw err;
    if (row == "") {
      res.status(404).render("pages/fail", { titulo: "ERRO 404", req: req, msg: "404" });
    } else {
      res.render("pages/postCompleto", {
        titulo: "Post Completo",
        dados: row,
        req: req,
      });
    }
  });
});

// Página de erro de acesso
app.get("/nao-autorizado", (req, res) => {
  console.log("GET /nao-autorizado");
  res.render("pages/nao-autorizado", { titulo: "Não Autorizado" });
});

// Rota para logout: destrói a sessão
app.get("/logout", (req, res) => {
  console.log("GET /logout");
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Rota para erros 404
app.use("/{*erro}", (req, res) => {
  res.status(404).render("pages/fail", { titulo: "ERRO 404", req: req, msg: "404" });
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor sendo executado na porta ${PORT}`);
});
