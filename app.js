//AO INICIAR UM ARQUIVO JS SEMPRE DECLARE UMA VARIAVEL DE SUA BIBLIOTECA
const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3");
const xss = require("xss");

//Função para evitar ataques xss de forma simples.
function cleanData(userInput) {
  return xss(userInput);
}

// const bodyparser = require("body-parser") //Até a versão 4 é necessario usar esse codigo

const app = express(); //Armazena as chamadas e propriedades da biblioteca EXPRESS

const PORT = 8000;



//Conexão com o Banco de Dados
const db = new sqlite3.Database("users.db");
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, id_user INTEGER, title TEXT, content TEXT, data_criacao TEXT)"
  );
});

//os cookies (mecanismo usado para armazenar dados no navegador do usuario)
app.use(
  session({
    secret: "senhaforte",
    resave: true,
    saveUninitialized: true,
  })
);


app.use("/static", express.static(__dirname + "/static"));

//Configuração do Express para processar requisições POST com BODY PARAMETERS
app.use(express.urlencoded({ extended: true })); // Versão Express >= 5.x.x

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  console.log("GET /");
  res.render("pages/index", { titulo: "Index", req: req });
});

app.get("/sobre", (req, res) => {
  console.log("GET /sobre");
  res.render("pages/sobre", { titulo: "Sobre", req: req });
});

app.get("/login", (req, res) => {
  console.log("GET /login");
  res.render("pages/login", { titulo: "Login" });
});

//Rota /login para processamento dos dados do formulário de LOGIN no cliente
app.post("/login", (req, res) => {
  console.log("POST /login");
  console.log(JSON.stringify(req.body));
  //cleanData o xss "limpa" o que o futuro hacker por exemplo injetar de script malicioso
  const username = cleanData(req.body.username);
  const password = cleanData(req.body.password);

  const query = `SELECT * FROM users WHERE username=? AND password=?`;

  db.get(query, [username, password], (err, row) => {
    if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO

    //1. Verificar se o usuário existe
    console.log(JSON.stringify(row));
    if (row) {
      //2. Se o usuário existir e a senha é válida no BD, executar o processo de login
      req.session.username = username;
      req.session.loggedin = true;
      req.session.id_username = row.id;
      res.redirect("/dashboard");
    } else {
      //3. Se não, executar processo de negação de login
      res.redirect("/user-senha-invalido");
    }
  });
  // res.render("pages/login")
});

app.get("/user-senha-invalido", (req, res) => {
  res.render("pages/user-senha-invalido", {
    titulo: "Usuario Senha Invalidos",
  });
});

app.get("/cadastro", (req, res) => {
  console.log("GET /cadastro");
  res.render("pages/cadastro", { titulo: "Cadastro" });
});

app.post("/cadastro", (req, res) => {
  console.log("POST /cadastro");
  console.log(JSON.stringify(req.body));

  const username = cleanData(req.body.username);
  const password = cleanData(req.body.password);

  const query1 = `SELECT * FROM users WHERE username=?`;
  const query2 = `INSERT INTO users (username, password) VALUES (? , ?)`;

  db.get(query1, [username], (err, row) => {
    if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO

    //1. Verificar se o usuário existe
    console.log(JSON.stringify(row));
    if (row) {
      //2. Se o usuário existir Negar o Cadastro
      console.log(`Usuario ${username} já cadastrado`);
      res.redirect("/usuario-ja-cadastrado");
    } else {
      //3. Se não, fazer o insert
      db.get(query2, [username, password], (err, row) => {
        if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO

        //1. Verificar se o usuário existe
        console.log(JSON.stringify(row));
        console.log(`Usuário ${username} cadastrado com sucesso`);
        res.redirect("/usuario-cadastrado");
      });
    }
  });
});

app.get("/usuario-cadastrado", (req, res) => {
  res.render("pages/usuario-cadastrado", { titulo: "Usuario Cadastrado" });
});

app.get("/usuario-ja-cadastrado", (req, res) => {
  res.render("pages/usuario-ja-cadastrado", {
    titulo: "Usuario Ja Cadastrado",
  });
});

app.get("/dashboard", (req, res) => {
  console.log("GET /dashboard");

  if (req.session.loggedin) {
    //Listar todos os Usuários
    const query = "SELECT * FROM users";
    db.all(query, [], (err, row) => {
      if (err) throw err;
      // Renderiza a Página dashboard com a lista de usuário coletada no BD
      res.render("pages/dashboard", {
        titulo: "Dashboard",
        dados: row,
        req: req,
      });
    });
  } else {
    tituloError = "Não Autorizado";
    res.redirect("/nao-autorizado");
  }
});

app.get("/posts", (req, res) => {
  console.log("GET /posts");
  const query = "SELECT * FROM posts";
    db.all(query, [], (err, row) => {
      if (err) throw err;
      res.render("pages/posts", {
        titulo: "Posts",
        dados: row,
        req: req,
      });
    });
});

app.get("/novo-post", (req, res) => {
  if (req.session.loggedin) {
    console.log("GET /novo-post");
    res.render("pages/novo-post", { titulo: "Nova Postagem", req: req });
  } else {
    tituloError = "Não Autorizado";
    res.redirect("/nao-autorizado");
  }
});

app.post("/novo-post", (req, res) => {
  console.log("POST /novo-post");
  // Pegar dados da postagem: User ID, Titulo, Conteudo, Data da Postagem
  //req.session.username, req.session.id
  if (req.session.loggedin) {
  const title = cleanData(req.body.username);
  const content = cleanData(req.body.password);
    const query = `INSERT INTO posts (id_user, title, content, data_criacao) VALUES (?, ? , ?, ?)`;
    const data = new Date();
    const data_atual = data.toLocaleDateString();
    console.log("Dados da Postagem: ", req.body);
    console.log(`UserName: ${req.session.username}, ID: ${req.session.id_username}`);
    console.log("Data: ", data_atual);
    db.get(query, [req.session.id_username ,title, content, data_atual], (err, row) => {
      if (err) throw err; //SE OCORRER O ERRO VÁ PARA O RESTO DO CÓDIGO
      //1. Verificar se o usuário existe
      console.log(JSON.stringify(row));
      res.send("Post Criado <br> <a href='/novo-post'>VOLTAR</a>")
    });

  } else {
    res.redirect("/nao-autorizado");
  }
});

app.get("/postCompleto/:id", (req, res) => {
  const postId = req.params.id;
  const query = "SELECT * FROM posts Where id = ?";
    db.all(query, [postId], (err, row) => {
      if (err) throw err;
      res.render("pages/postCompleto", {
        titulo: "Post Completo",
        dados: row,
        req: req,
      });
    });
  });

app.get("/nao-autorizado", (req, res) => {
  console.log("GET /nao-autorizado");
  res.render("pages/nao-autorizado", { titulo: "Não Autorizado" });
});

app.get("/logout", (req, res) => {
  console.log("GET /logout");
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.use("/{*erro}", (req, res) => {
  // Envia uma resposta de erro 404
  res
    .status(404)
    .render("pages/fail", { titulo: "ERRO 404", req: req, msg: "404" });
});

app.listen(PORT, () => {
  console.log(`Servidor sendo executado na porta ${PORT}`);
});