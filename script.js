import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc 
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

/* 🔥 CACHE OFFLINE (MUITO IMPORTANTE) */
enableIndexedDbPersistence(db).catch(() => {
  console.log("Cache offline não ativado");
});

/* ADICIONAR */
window.adicionar = async function () {
  const nome = document.getElementById("nome").value;
  const marca = document.getElementById("marca").value;
  const data = document.getElementById("data").value;
  const quantidade = document.getElementById("quantidade").value;
  const gestao = document.getElementById("gestao").value;

  if (!nome || !data || !quantidade) {
    alert("Preencha produto, data e quantidade");
    return;
  }

  try {
    await addDoc(collection(db, "produtos"), {
      nome,
      marca,
      data,
      quantidade: Number(quantidade),
      gestao,
      criadoEm: new Date()
    });
  } catch (e) {
    alert("Erro ao salvar");
  }

  document.getElementById("nome").value = "";
  document.getElementById("marca").value = "";
  document.getElementById("data").value = "";
  document.getElementById("quantidade").value = "";
};

/* EXCLUIR */
window.excluir = async function (id) {
  await deleteDoc(doc(db, "produtos", id));
};

/* COR */
function calcularClasse(data) {
  const hoje = new Date();
  const venc = new Date(data);

  const diffMeses = (venc - hoje) / (1000 * 60 * 60 * 24 * 30);

  if (diffMeses <= 3) return "vermelho";
  if (diffMeses <= 6) return "amarelo";
  return "normal";
}

/* 🔥 CARREGA AUTOMATICAMENTE AO ABRIR */
onSnapshot(collection(db, "produtos"), snapshot => {
  const lista = document.getElementById("lista");
  const select = document.getElementById("filtroMarca");
  const filtro = select.value;

  lista.innerHTML = "";

  let marcas = new Set();
  let agrupados = {};

  snapshot.forEach(docSnap => {
    const item = docSnap.data();
    const id = docSnap.id;

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
      quantidade: item.quantidade,
      id
    });
  });

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

    let linhasDatas = "";

    produto.itens.forEach(i => {
      const classe = calcularClasse(i.data);

      linhasDatas += `
        <div class="vencimento ${classe}">
          ${i.data} → Qtd: ${i.quantidade}
        </div>
      `;
    });

    div.innerHTML = `
      <div class="info">
        <div class="nome">${produto.nome}</div>
        <div>Marca: ${produto.marca || "-"}</div>

        <div>
          Markdown:
          <strong style="color:${produto.gestao === 'sim' ? 'red' : 'green'}">
            ${produto.gestao === 'sim' ? 'SIM' : 'NÃO'}
          </strong>
        </div>

        ${linhasDatas}
      </div>

      <button class="excluir" onclick="excluir('${produto.itens[0].id}')">X</button>
    `;

    lista.appendChild(div);
  });
});