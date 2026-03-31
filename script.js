import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* CONFIG FIREBASE */
const firebaseConfig = {
  apiKey: "SUA_KEY",
  authDomain: "SEU_DOMINIO",
  projectId: "SEU_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* CACHE OFFLINE */
enableIndexedDbPersistence(db).catch(() => {
  console.log("Cache offline não ativado");
});

/* ADICIONAR */
window.adicionar = async function () {
  const nome = document.getElementById("nome").value.trim();
  const marca = document.getElementById("marca").value.trim();
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
  document.getElementById("marca").value = "";
  document.getElementById("data").value = "";
  document.getElementById("quantidade").value = "";
};

/* EXCLUIR TODOS DO PRODUTO */
window.excluirGrupo = async function (nome, marca) {
  const snapshot = await getDocs(collection(db, "produtos"));

  snapshot.forEach(async (docSnap) => {
    const item = docSnap.data();

    if (item.nome === nome && item.marca === marca) {
      await deleteDoc(doc(db, "produtos", docSnap.id));
    }
  });
};

/* COR VENCIMENTO */
function calcularClasse(data) {
  const hoje = new Date();
  const venc = new Date(data);

  const diffMeses = (venc - hoje) / (1000 * 60 * 60 * 24 * 30);

  if (diffMeses <= 3) return "vermelho";
  if (diffMeses <= 6) return "amarelo";
  return "normal";
}

/* LISTAGEM */
const select = document.getElementById("filtroMarca");

select.addEventListener("change", carregar);

function carregar() {
  onSnapshot(collection(db, "produtos"), snapshot => {
    const lista = document.getElementById("lista");
    const filtro = select.value;

    lista.innerHTML = "";

    let marcas = new Set();
    let agrupados = {};

    snapshot.forEach(docSnap => {
      const item = docSnap.data();

      if (item.marca) marcas.add(item.marca);

      if (filtro && item.marca !== filtro) return;

      const chave = item.nome + "_" + item.marca;

      if (!agrupados[chave]) {
        agrupados[chave] = {
          nome: item.nome,
          marca: item.marca,
          gestao: item.gestao,
          itens: []
        };
      }

      agrupados[chave].itens.push({
        data: item.data,
        quantidade: item.quantidade
      });
    });

    /* CORRIGIDO: NÃO PERDE MARCAS */
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Todas as marcas</option>';

    marcas.forEach(m => {
      const option = document.createElement("option");
      option.value = m;
      option.textContent = m;
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
          </div>
        `;
      });

      div.innerHTML = `
        <div class="info">
          <div class="nome">${produto.nome}</div>
          <div class="marca">Marca: ${produto.marca || "-"}</div>

          <div>
            Markdown:
            <strong class="${produto.gestao === 'sim' ? 'sim' : 'nao'}">
              ${produto.gestao === 'sim' ? 'SIM' : 'NÃO'}
            </strong>
          </div>

          ${linhas}
        </div>

        <button class="excluir" onclick="excluirGrupo('${produto.nome}', '${produto.marca}')">X</button>
      `;

      lista.appendChild(div);
    });
  });
}

/* INICIAL */
carregar();