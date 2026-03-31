import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* CONFIG */
const firebaseConfig = {
  apiKey: "SUA_KEY",
  authDomain: "SEU_DOMINIO",
  projectId: "SEU_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch(() => {});

/* ========================= */
/* VENCIMENTOS (INTACTO) */
/* ========================= */

let ultimoExcluido = null;
let timeoutExclusao = null;

window.adicionar = async function () {
  const nome = document.getElementById("nome").value.trim();
  const marca = document.getElementById("marca").value;
  const data = document.getElementById("data").value;
  const quantidade = document.getElementById("quantidade").value;
  const gestao = document.getElementById("gestao").value;

  if (!nome || !data || !quantidade) {
    alert("Preencha produto, data e quantidade");
    return;
  }

  await addDoc(collection(db, "produtos"), {
    nome,
    marca,
    data,
    quantidade: Number(quantidade),
    gestao,
    criadoEm: new Date()
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
    criadoEm: new Date()
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

window.excluirGrupo = async function (nome, marca) {
  const snapshot = await getDocs(collection(db, "produtos"));

  snapshot.forEach(async (docSnap) => {
    const item = docSnap.data();
    if (item.nome === nome && item.marca === marca) {
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

      if (item.marca) setores.add(item.marca);
      if (filtro && item.marca !== filtro) return;

      const chave = item.nome + "_" + item.marca;

      if (!agrupados[chave]) {
        agrupados[chave] = {
          nome: item.nome,
          marca: item.marca,
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
          <div class="marca">Setor: ${produto.marca}</div>
          ${linhas}
        </div>

        <button class="excluir" onclick="excluirGrupo('${produto.nome}', '${produto.marca}')">X</button>
      `;

      lista.appendChild(div);
    });

  });
}

carregar();

/* ========================= */
/* ESTOQUE (CORRIGIDO) */
/* ========================= */

window.adicionarEstoque = function () {

  const produtoInput = document.getElementById("produtoEstoque");
  const setorInput = document.getElementById("setor");
  const fisicoInput = document.getElementById("fisico");
  const logicoInput = document.getElementById("logico");

  if (!produtoInput || !setorInput || !fisicoInput || !logicoInput) {
    console.log("Campos de estoque não encontrados");
    return;
  }

  const produto = produtoInput.value.trim();
  const setor = setorInput.value;
  const fisico = Number(fisicoInput.value);
  const logico = Number(logicoInput.value);

  if (!produto || isNaN(fisico) || isNaN(logico)) {
    alert("Preencha todos os campos do estoque");
    return;
  }

  const diferenca = fisico - logico;

  const item = { produto, setor, fisico, logico, diferenca };

  const dados = JSON.parse(localStorage.getItem("estoqueErro")) || [];
  dados.push(item);
  localStorage.setItem("estoqueErro", JSON.stringify(dados));

  renderEstoque();

  produtoInput.value = "";
  fisicoInput.value = "";
  logicoInput.value = "";
};

function renderEstoque() {

  const sobraDiv = document.getElementById("listaSobra");
  const faltaDiv = document.getElementById("listaFalta");

  if (!sobraDiv || !faltaDiv) return;

  const dados = JSON.parse(localStorage.getItem("estoqueErro")) || [];

  sobraDiv.innerHTML = "";
  faltaDiv.innerHTML = "";

  dados.forEach((item, index) => {

    const div = document.createElement("div");
    div.className = "item estoque-item";

    div.innerHTML = `
      <div>
        <strong>${item.produto}</strong> (${item.setor})<br>
        Físico: ${item.fisico} | Lógico: ${item.logico}<br>
        Diferença: ${item.diferenca}
      </div>
      <button onclick="removerEstoque(${index})">X</button>
    `;

    if (item.diferenca > 0) {
      sobraDiv.appendChild(div);
    } else if (item.diferenca < 0) {
      faltaDiv.appendChild(div);
    }
  });
}

window.removerEstoque = function (index) {
  const dados = JSON.parse(localStorage.getItem("estoqueErro")) || [];
  dados.splice(index, 1);
  localStorage.setItem("estoqueErro", JSON.stringify(dados));
  renderEstoque();
};

/* GARANTE QUE RODA DEPOIS DO HTML */
window.addEventListener("load", () => {
  renderEstoque();
});