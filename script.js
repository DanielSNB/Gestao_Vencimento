import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { 
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyBg4gWmKDWnH4cNAq-gJ8nmaaNQ7rw4XMEk",
  authDomain: "gestao-vencimento.firebaseapp.com",
  projectId: "gestao-vencimento",
  storageBucket: "gestao-vencimento.firebasestorage.app",
  messagingSenderId: "769897586722",
  appId: "1:769897586722:web:8e9df7539c20b8d1d12a7b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch(() => {});

/* ========================= */
/* VENCIMENTOS */
/* ========================= */

let ultimoExcluido = null;
let timeoutExclusao = null;

window.adicionar = async function () {
  const nome = document.getElementById("nome").value.trim();
  const setor = document.getElementById("marca").value; // HTML ainda usa id="marca"
  const data = document.getElementById("data").value;
  const quantidade = document.getElementById("quantidade").value;
  const gestao = document.getElementById("gestao").value;

  if (!nome || !data || !quantidade) {
    alert("Preencha produto, data e quantidade");
    return;
  }

  await addDoc(collection(db, "produtos"), {
    nome,
    setor, // 🔥 AGORA É SETOR
    data,
    quantidade: Number(quantidade),
    gestao,
    criadoEm: serverTimestamp()
  });

  document.getElementById("nome").value = "";
  document.getElementById("data").value = "";
  document.getElementById("quantidade").value = "";
};

window.excluirItem = async function (id) {
  const snapshot = await getDocs(collection(db, "produtos"));

  let itemBackup = null;
  snapshot.forEach(docSnap => {
    if (docSnap.id === id) itemBackup = docSnap.data();
  });

  if (!itemBackup) return;

  ultimoExcluido = { id, ...itemBackup };

  await deleteDoc(doc(db, "produtos", id));

  mostrarUndo();
};

window.desfazer = async function () {
  if (!ultimoExcluido) return;

  await addDoc(collection(db, "produtos"), {
    ...ultimoExcluido,
    criadoEm: serverTimestamp()
  });

  ultimoExcluido = null;
  esconderUndo();
};

function mostrarUndo() {
  let barra = document.getElementById("undoBar");

  if (!barra) {
    barra = document.createElement("div");
    barra.id = "undoBar";
    document.body.appendChild(barra);
  }

  barra.innerHTML = `Item excluído <button onclick="desfazer()">Desfazer</button>`;
  barra.style.display = "flex";

  clearTimeout(timeoutExclusao);
  timeoutExclusao = setTimeout(() => {
    ultimoExcluido = null;
    esconderUndo();
  }, 5000);
}

function esconderUndo() {
  const barra = document.getElementById("undoBar");
  if (barra) barra.style.display = "none";
}

window.excluirGrupo = async function (nome, setor) {
  const snapshot = await getDocs(collection(db, "produtos"));

  snapshot.forEach(async (docSnap) => {
    const item = docSnap.data();
    if (item.nome === nome && item.setor === setor) {
      await deleteDoc(doc(db, "produtos", docSnap.id));
    }
  });
};

function calcularClasse(data) {
  const hoje = new Date();
  const venc = new Date(data);
  const diffMeses = (venc - hoje) / (1000 * 60 * 60 * 24 * 30);

  if (diffMeses <= 3) return "vermelho";
  if (diffMeses <= 6) return "amarelo";
  return "normal";
}

const select = document.getElementById("filtroMarca");
select.addEventListener("change", carregar);

function carregar() {
  onSnapshot(collection(db, "produtos"), snapshot => {

    const lista = document.getElementById("lista");
    const filtro = select.value;

    lista.innerHTML = "";

    let setores = new Set();
    let agrupados = {};

    snapshot.forEach(docSnap => {
      const item = docSnap.data();

      if (item.setor) setores.add(item.setor);
      if (filtro && item.setor !== filtro) return;

      const chave = item.nome + "_" + item.setor;

      if (!agrupados[chave]) {
        agrupados[chave] = {
          nome: item.nome,
          setor: item.setor,
          itens: []
        };
      }

      agrupados[chave].itens.push({
        id: docSnap.id,
        data: item.data,
        quantidade: item.quantidade,
        gestao: item.gestao
      });
    });

    const valorAtual = select.value;
    select.innerHTML = '<option value="">Todos os setores</option>';

    setores.forEach(s => {
      const option = document.createElement("option");
      option.value = s;
      option.textContent = s;
      select.appendChild(option);
    });

    select.value = valorAtual;

    Object.values(agrupados).forEach(produto => {

      produto.itens.sort((a, b) => new Date(a.data) - new Date(b.data));

      const div = document.createElement("div");
      div.className = "item";

      let linhas = "";

      produto.itens.forEach(i => {
        const classe = calcularClasse(i.data);

        linhas += `
          <div class="vencimento ${classe}">
            ${i.data} → Qtd: ${i.quantidade}
            <strong class="${i.gestao === 'sim' ? 'sim' : 'nao'}">
              (${i.gestao === 'sim' ? 'Markdown: SIM' : 'Markdown: NÃO'})
            </strong>
            <button class="btn-mini" onclick="excluirItem('${i.id}')">🗑</button>
          </div>
        `;
      });

      div.innerHTML = `
        <div class="info">
          <div class="nome">${produto.nome}</div>
          <div class="marca">Setor: ${produto.setor}</div>
          ${linhas}
        </div>

        <button onclick="excluirGrupo('${produto.nome}', '${produto.setor}')">
          Excluir Grupo
        </button>
      `;

      lista.appendChild(div);
    });

  });
}

carregar();

/* ========================= */
/* ESTOQUE (INALTERADO) */
/* ========================= */

window.adicionarEstoque = function () {
  const nome = document.getElementById("produtoEstoque").value;
  const setor = document.getElementById("setor").value;
  const fisico = Number(document.getElementById("fisico").value);
  const logico = Number(document.getElementById("logico").value);

  if (!nome || isNaN(fisico) || isNaN(logico)) return;

  const diferenca = fisico - logico;

  const div = document.createElement("div");
  div.className = "item";

  div.innerHTML = `
    <strong>${nome}</strong> (${setor})<br>
    Diferença: ${diferenca}
  `;

  if (diferenca > 0) {
    document.getElementById("listaSobra").appendChild(div);
  } else if (diferenca < 0) {
    document.getElementById("listaFalta").appendChild(div);
  }

  document.getElementById("produtoEstoque").value = "";
  document.getElementById("fisico").value = "";
  document.getElementById("logico").value = "";
};