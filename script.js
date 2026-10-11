
const svg = document.getElementById("graph");

const NS = "http://www.w3.org/2000/svg";
const n = 4;

const nodes = [
  { id: 0, label: "1", x: 100, y: 80 },
  { id: 1, label: "2", x: 390, y: 80 },
  { id: 2, label: "3", x: 390, y: 260 },
  { id: 3, label: "4", x: 100, y: 260 }
];

let edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0]
];

let selected = [];
let drag = null;

const $ = id => document.getElementById(id);

function edgeKey(a, b) {
  return [Math.min(a, b), Math.max(a, b)].join("-");
}

function hasEdge(a, b) {
  return edges.some(e => edgeKey(e[0], e[1]) === edgeKey(a, b));
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

// Construye el dibujo a partir de los vértices y las aristas.
function drawGraph() {
  svg.replaceChildren();

  // Dibujar primero las aristas para que queden detrás.
  edges.forEach(([a, b]) => {
    const u = nodes[a];
    const v = nodes[b];

    const line = createSvgElement("line", {
      x1: u.x,
      y1: u.y,
      x2: v.x,
      y2: v.y,
      class: "graph-edge",
      "data-edge": edgeKey(a, b)
    });

    line.appendChild(
      createSvgElement("title")
    ).textContent = `Quitar arista ${a + 1}–${b + 1}`;

    svg.appendChild(line);
  });

  nodes.forEach(node => {
    const group = createSvgElement("g", {
      "data-node": node.id
    });

    const circle = createSvgElement("circle", {
      cx: node.x,
      cy: node.y,
      r: 23,
      class: selected.includes(node.id)
        ? "graph-node selected"
        : "graph-node",
      tabindex: 0,
      role: "button",
      "aria-label": `Vértice ${node.label}`
    });

    const label = createSvgElement("text", {
      x: node.x,
      y: node.y,
      class: "node-label"
    });
    label.textContent = node.label;

    group.append(circle, label);
    svg.appendChild(group);
  });
}

// Obtener la matriz de adyacencia.
function adjacencyMatrix() {
  const A = Array.from(
    { length: n },
    () => Array(n).fill(0)
  );

  edges.forEach(([a, b]) => {
    A[a][b] = 1;
    A[b][a] = 1;
  });

  return A;
}

// Multiplicación de matrices cuadradas.
function multiplyMatrices(A, B) {
  const size = A.length;
  const C = Array.from(
    { length: size },
    () => Array(size).fill(0)
  );

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        C[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return C;
}

// Representación HTML de una matriz.
function showMatrix(elementId, M) {
  const container = $(elementId);
  const table = document.createElement("table");
  const body = document.createElement("tbody");

  M.forEach(row => {
    const tr = document.createElement("tr");

    row.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });

  table.appendChild(body);
  container.replaceChildren(table);
}

// Cuenta las componentes conexas del grafo.
function countComponents(A) {
  const visited = Array(n).fill(false);
  let count = 0;

  for (let start = 0; start < n; start++) {
    if (visited[start]) continue;

    count++;
    const stack = [start];
    visited[start] = true;

    while (stack.length > 0) {
      const u = stack.pop();

      for (let v = 0; v < n; v++) {
        if (A[u][v] && !visited[v]) {
          visited[v] = true;
          stack.push(v);
        }
      }
    }
  }

  return count;
}

function updateEdgeControls() {
  const info = $("selectionInfo");
  const toggle = $("toggleEdgeBtn");

  if (selected.length === 0) {
    info.textContent = "Selecciona dos vértices.";
    toggle.disabled = true;
    toggle.textContent = "Agregar arista";
    return;
  }

  if (selected.length === 1) {
    info.textContent =
      `Vértice seleccionado: ${selected[0] + 1}. ` +
      "Selecciona otro.";
    toggle.disabled = true;
    toggle.textContent = "Agregar arista";
    return;
  }

  const [a, b] = selected;
  const exists = hasEdge(a, b);

  info.textContent =
    `Vértices ${a + 1} y ${b + 1}: ` +
    (exists ? "ya están conectados." : "no están conectados.");

  toggle.disabled = false;
  toggle.textContent = exists
    ? "Quitar esta arista"
    : "Agregar esta arista";
}

function updateEdgeSelect() {
  const select = $("edgeSelect");
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecciona una arista";
  select.appendChild(placeholder);

  edges.forEach(([a, b]) => {
    const option = document.createElement("option");
    option.value = edgeKey(a, b);
    option.textContent = `${a + 1} — ${b + 1}`;
    select.appendChild(option);
  });

  $("removeEdgeBtn").disabled = edges.length === 0;
}

function updateMatrices() {
  const A = adjacencyMatrix();

  // Grado de cada vértice: suma de su fila en A.
  const degrees = A.map(row =>
    row.reduce((sum, value) => sum + value, 0)
  );

  // Matriz diagonal de grados.
  const D = Array.from(
    { length: n },
    (_, i) => Array.from(
      { length: n },
      (_, j) => i === j ? degrees[i] : 0
    )
  );

  // Matriz laplaciana: L = D - A.
  const L = D.map((row, i) =>
    row.map((value, j) => value - A[i][j])
  );

  // A²: número de recorridos de longitud dos.
  const A2 = multiplyMatrices(A, A);

  showMatrix("adjacencyMatrix", A);
  showMatrix("degreeMatrix", D);
  showMatrix("laplacianMatrix", L);
  showMatrix("squareMatrix", A2);

  $("edgeCount").textContent =
    `Número de aristas: ${edges.length}`;

  $("degreeSum").textContent =
    `Suma de grados: ${degrees.reduce((a, b) => a + b, 0)}`;

  $("components").textContent =
    `Componentes conexas: ${countComponents(A)}`;

  const isolated = degrees
    .map((d, i) => d === 0 ? i + 1 : null)
    .filter(v => v !== null);

  const allConnected = countComponents(A) === 1;

  let message =
    `Los grados son (${degrees.join(", ")}). ` +
    `La matriz A es simétrica y L = D − A. `;

  message += allConnected
    ? "El grafo es conexo."
    : `El grafo tiene ${countComponents(A)} componentes conexas.`;

  if (isolated.length) {
    message += ` Vértices aislados: ${isolated.join(", ")}.`;
  }

  message +=
    " Cada entrada de A² cuenta los recorridos de dos aristas " +
    "entre el vértice de la fila y el de la columna.";

  $("insightText").textContent = message;
}

function refresh() {
  drawGraph();
  updateEdgeControls();
  updateEdgeSelect();
  updateMatrices();
}

// Selección y arrastre de vértices.
// Las coordenadas se convierten al sistema del SVG.
function svgPoint(event) {
  const rect = svg.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * 500 / rect.width,
    y: (event.clientY - rect.top) * 340 / rect.height
  };
}

svg.addEventListener("pointerdown", event => {
  const nodeGroup = event.target.closest("[data-node]");
  const edgeLine = event.target.closest("[data-edge]");

  if (nodeGroup) {
    const id = Number(nodeGroup.getAttribute("data-node"));
    const point = svgPoint(event);

    drag = {
      id,
      startX: point.x,
      startY: point.y,
      moved: false
    };

    svg.setPointerCapture(event.pointerId);
    event.preventDefault();
    return;
  }

  if (edgeLine) {
    const key = edgeLine.getAttribute("data-edge");
    edges = edges.filter(e => edgeKey(e[0], e[1]) !== key);
    refresh();
  }
});

svg.addEventListener("pointermove", event => {
  if (!drag) return;

  const point = svgPoint(event);
  const dx = point.x - drag.startX;
  const dy = point.y - drag.startY;

  if (Math.hypot(dx, dy) > 3) {
    drag.moved = true;
  }

  if (!drag.moved) return;

  const node = nodes[drag.id];
  node.x = Math.max(28, Math.min(472, point.x));
  node.y = Math.max(28, Math.min(312, point.y));

  drawGraph();
});

svg.addEventListener("pointerup", event => {
  if (!drag) return;

  const { id, moved } = drag;
  drag = null;

  if (!moved) {
    if (selected.includes(id)) {
      selected = selected.filter(v => v !== id);
    } else if (selected.length < 2) {
      selected.push(id);
    } else {
      selected = [id];
    }
  }

  refresh();
});

svg.addEventListener("pointercancel", () => {
  drag = null;
});

// Agregar o quitar una arista entre los dos vértices elegidos.
$("toggleEdgeBtn").addEventListener("click", () => {
  if (selected.length !== 2) return;

  const [a, b] = selected;
  const key = edgeKey(a, b);

  if (hasEdge(a, b)) {
    edges = edges.filter(e => edgeKey(e[0], e[1]) !== key);
  } else {
    edges.push([a, b]);
  }

  refresh();
});

$("removeEdgeBtn").addEventListener("click", () => {
  const key = $("edgeSelect").value;
  if (!key) return;

  edges = edges.filter(e => edgeKey(e[0], e[1]) !== key);
  refresh();
});

// Restaurar el grafo inicial y las posiciones.
$("resetBtn").addEventListener("click", () => {
  nodes[0].x = 100; nodes[0].y = 80;
  nodes[1].x = 390; nodes[1].y = 80;
  nodes[2].x = 390; nodes[2].y = 260;
  nodes[3].x = 100; nodes[3].y = 260;

  edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0]
  ];

  selected = [];
  refresh();
});

refresh();
