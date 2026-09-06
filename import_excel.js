const fs = require('fs');
const xlsx = require('xlsx');
const axios = require('axios');

// Configuración
const EXCEL_PATH = './Stakes.xlsx'; // Ruta relativa al archivo en tu disco
const API_BASE = 'http://localhost:8080/api/v1';

async function importData() {
  console.log('--- Iniciando importación de Stakes.xlsx ---');
  
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`Error: No se encontró el archivo en ${EXCEL_PATH}`);
    return;
  }

  // 1. Leer el Excel (hoja Selecciones)
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = 'Selecciones';
  if (!workbook.Sheets[sheetName]) {
    console.error(`Error: No se encontró la hoja '${sheetName}' en el Excel.`);
    return;
  }
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`Leídas ${data.length} filas del Excel.`);

  // 2. Extraer y crear Canales únicos (basado en la columna ORIGEN)
  const orígenes = [...new Set(data.map(row => row['ORIGEN']).filter(Boolean))];
  const canalesEnBd = {};

  console.log('Creando canales...');
  for (const origen of orígenes) {
    try {
      const res = await axios.post(`${API_BASE}/channels`, {
        name: origen,
        type: 'HISTORICO'
      });
      canalesEnBd[origen] = res.data;
      console.log(`✅ Canal creado: ${origen} (ID: ${res.data.id})`);
    } catch (e) {
      console.error(`❌ Error creando canal ${origen}:`, e.message);
    }
  }

  // 3. Agrupar filas por ID Apuesta (FK)
  const apuestasMap = {};
  data.forEach(row => {
    const idApuesta = row['ID Apuesta (FK)'];
    if (!idApuesta) return;
    
    if (!apuestasMap[idApuesta]) {
      apuestasMap[idApuesta] = [];
    }
    apuestasMap[idApuesta].push(row);
  });

  // 4. Crear los Tickets (y sus Tips asociados)
  console.log('\nProcesando Tickets...');
  for (const [idApuesta, filas] of Object.entries(apuestasMap)) {
    const primeraFila = filas[0];
    
    // Parsear fecha (el excel suele traer fechas como dd/mm/yyyy o mm/dd/yyyy o número Excel)
    let fechaDate = new Date();
    if (primeraFila['Fecha']) {
      if (typeof primeraFila['Fecha'] === 'number') {
        // Formato número serial de Excel
        fechaDate = new Date(Math.round((primeraFila['Fecha'] - 25569) * 86400 * 1000));
      } else {
        const partes = String(primeraFila['Fecha']).split('/');
        if (partes.length === 3) {
          fechaDate = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`); // yyyy-mm-dd (asumiendo dd/mm/yyyy original)
        }
      }
    }
    // Asegurarse de que sea válida
    if (isNaN(fechaDate.getTime())) fechaDate = new Date();
    const fechaString = fechaDate.toISOString().substring(0, 10);
    
    const canal = canalesEnBd[primeraFila['ORIGEN']];

    // Construir el objeto Ticket
    const nuevoTicket = {
      date: fechaString,
      type: 'Combinada',
      bookmaker: 'Histórico',
      stake: 1.0, 
      totalOdds: 1.0, 
      originalTipster: true,
      result: 'PENDIENTE',
      selections: []
    };

    let cuotaTotal = 1.0;
    let tienePerdida = false;
    let todasGanadas = true;

    for (const fila of filas) {
      const cuota = parseFloat(fila['Cuota Indiv.']) || 1.0;
      cuotaTotal *= cuota;
      
      const resultadoPick = fila['Resultado Pick'] ? String(fila['Resultado Pick']).toUpperCase() : 'PENDIENTE';
      if (resultadoPick === 'PERDIDA') tienePerdida = true;
      if (resultadoPick !== 'GANADA') todasGanadas = false;

      nuevoTicket.selections.push({
        result: resultadoPick,
        tip: {
          channel: canal || null,
          date: fechaString,
          event: fila['Evento'] || 'Evento Desconocido',
          market: fila['Mercado'] || 'N/A',
          pick: fila['Pronóstico'] || 'N/A',
          odds: cuota,
          result: resultadoPick
        }
      });
    }

    nuevoTicket.totalOdds = parseFloat(cuotaTotal.toFixed(3));
    if (tienePerdida) nuevoTicket.result = 'PERDIDA';
    else if (todasGanadas) nuevoTicket.result = 'GANADA';

    try {
      // 1. Guardar Tips primero
      const tipsCreados = [];
      for (const sel of nuevoTicket.selections) {
        const resTip = await axios.post(`${API_BASE}/tips`, sel.tip);
        tipsCreados.push(resTip.data);
      }

      // 2. Enlazar Tips creados a las selecciones del Ticket
      for (let i = 0; i < nuevoTicket.selections.length; i++) {
        nuevoTicket.selections[i].tip = tipsCreados[i];
      }

      // 3. Guardar el Ticket
      const resTicket = await axios.post(`${API_BASE}/tickets`, nuevoTicket);
      console.log(`✅ Ticket ${idApuesta} creado correctamente con ${filas.length} selecciones (Cuota: ${nuevoTicket.totalOdds}).`);
    } catch (e) {
      console.error(`❌ Error creando Ticket ${idApuesta}:`, e.message);
    }
  }

  console.log('\n--- Importación finalizada ---');
}

importData();
