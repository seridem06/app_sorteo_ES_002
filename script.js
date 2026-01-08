/* === script.js === */

var HORARIO_MAESTRO = [];
var horasVillaActuales = ["05:48", "06:02", "06:16", "06:30", "06:44", "07:00", "07:14", "07:28", "07:42", "07:56"];
var indexTabla = 0; 
var indexVilla = 0;
var ganadoresGlobales = new Set();

// Referencias al DOM (elementos del HTML)
const listaIzq = document.getElementById('lista-izq');
const listaDer = document.getElementById('lista-der');
const ulVilla = document.getElementById('lista-villa');
const bodyTabla = document.getElementById('body-tabla');
const btnIniciar = document.getElementById('btn-iniciar');
const btnReset = document.getElementById('btn-reset');
const visorIzq = document.getElementById('visor-izq');
const visorDer = document.getElementById('visor-der');
const statusIzq = document.getElementById('status-izq');
const statusDer = document.getElementById('status-der');
const inputLimite = document.getElementById('input-limite');
const inputHoraInicio = document.getElementById('input-hora-inicio');
const inputMinutos = document.getElementById('input-minutos');
const contadorGlobalEl = document.getElementById('contador-global');
const selNumRangos = document.getElementById('sel-num-rangos');
const msgHorario = document.getElementById('msg-horario');
const infoDemanda = document.getElementById('info-demanda');
const inputHoraBloqueo = document.getElementById('input-hora-bloqueo');

let backupListaIzq = ""; let backupListaDer = ""; let enCurso = false; let contadorTotalSorteados = 0; let unidadesTotalesEstimadas = 0;

function calcularTotalUnidades() {
    const numVilla = parseInt(inputLimite.value) || 0;
    const lineasDer = listaDer.value.split('\n').filter(l => l.trim() !== '').length;
    const lineasIzq = listaIzq.value.split('\n').filter(l => l.trim() !== '').length;
    
    // CÁLCULO DIRECTO: Suma de los dos cuadros
    unidadesTotalesEstimadas = lineasIzq + lineasDer;
    infoDemanda.textContent = `Total a Programar: ${unidadesTotalesEstimadas}`;
}

function actualizarRangosVisibles() {
    const num = parseInt(selNumRangos.value);
    for(let i=1; i<=4; i++) {
        document.getElementById(`fila-r${i}`).style.display = (i <= num) ? 'grid' : 'none';
    }
}

function sincronizarHoras() {
    document.getElementById('r2-ini').value = document.getElementById('r1-fin').value;
    document.getElementById('r3-ini').value = document.getElementById('r2-fin').value;
    document.getElementById('r4-ini').value = document.getElementById('r3-fin').value;
}

function initTabla() {
    let html = '';
    HORARIO_MAESTRO.forEach((item, i) => {
        const claseTexto = item.t === 'VILLA' ? 'txt-azul' : 'txt-rojo';
        const claseCelda = item.lock ? 'celda-bloqueada' : 'celda-normal';
        const contenido = item.ganador ? item.ganador : '';
        html += `<tr><td class="${claseTexto}">${item.t}</td><td class="${claseTexto}">${item.h}</td><td id="celda-${i}" class="${claseCelda}">${contenido}</td></tr>`;
    });
    bodyTabla.innerHTML = html;
}

// --- LÓGICA DE GENERACIÓN MEJORADA ---
function generarHorarioPorDemanda() {
    calcularTotalUnidades();
    HORARIO_MAESTRO = [];
    const numRangos = parseInt(selNumRangos.value);
    if(unidadesTotalesEstimadas === 0) { initTabla(); return; }

    const iniGlobal = document.getElementById('r1-ini').value;
    const [hI, mI] = iniGlobal.split(':').map(Number);
    let dateCursor = new Date(); dateCursor.setHours(hI, mI, 0, 0);

    let configs = [];
    for(let i=1; i<=numRangos; i++){
        configs.push({
            fin: document.getElementById(`r${i}-fin`).value,
            frec: parseInt(document.getElementById(`r${i}-frec`).value),
            tipo: document.getElementById(`r${i}-tipo`).value
        });
    }

    let espaciosValidosGenerados = 0;
    let bloqueosAsignados = 0; // CONTADOR DE BLOQUEOS REAL
    const cantidadVillaBloqueada = parseInt(inputLimite.value) || 0;
    const [hB, mB] = inputHoraBloqueo.value.split(':').map(Number);
    const targetTimeBlock = hB * 60 + mB; 

    let contadorIntercalado = 0;
    
    // CÁLCULO EXACTO: Huecos que necesitamos en la tabla = Total de Códigos - Códigos que se van a Villa
    let slotsNecesariosTabla = Math.max(0, unidadesTotalesEstimadas - cantidadVillaBloqueada);

    while (espaciosValidosGenerados < slotsNecesariosTabla) {
        let configActual = configs[configs.length - 1];
        let hStr = dateCursor.getHours().toString().padStart(2,'0') + ":" + dateCursor.getMinutes().toString().padStart(2,'0');
        
        for(let i=0; i<configs.length; i++) {
            if (hStr < configs[i].fin) { configActual = configs[i]; break; }
        }

        let h = dateCursor.getHours().toString().padStart(2,'0');
        let m = dateCursor.getMinutes().toString().padStart(2,'0');
        let horaStr = `${h}:${m}`;
        let currentTimeMins = dateCursor.getHours() * 60 + dateCursor.getMinutes();

        let tipoFila = (configActual.tipo === "INTERCALADO") ? ((contadorIntercalado % 2 === 0) ? "VILLA" : "D") : configActual.tipo;
        if (configActual.tipo === "INTERCALADO") contadorIntercalado++;

        let isLock = false;
        // SOLO BLOQUEAR SI NO SE HA SUPERADO EL LÍMITE DE VILLA
        if (tipoFila === 'VILLA' && currentTimeMins >= targetTimeBlock) {
            if (bloqueosAsignados < cantidadVillaBloqueada) {
                isLock = true;
                bloqueosAsignados++;
            }
        }

        HORARIO_MAESTRO.push({ t: tipoFila, h: horaStr, lock: isLock, ganador: null });
        
        // Si no está bloqueado, cuenta como espacio válido para un código
        if (!isLock) espaciosValidosGenerados++;

        dateCursor.setMinutes(dateCursor.getMinutes() + configActual.frec);
        if (HORARIO_MAESTRO.length > 2000) break;
    }
    initTabla();
}

function generarNuevoHorarioVilla() {
    const inicioStr = inputHoraInicio.value; 
    const intervalo = parseInt(inputMinutos.value);
    if (!inicioStr || isNaN(intervalo)) return;
    const [horas, minutos] = inicioStr.split(':').map(Number);
    let fechaBase = new Date(); fechaBase.setHours(horas, minutos, 0, 0);
    let nuevasHoras = [];
    for (let i = 0; i < 30; i++) {
        let h = fechaBase.getHours().toString().padStart(2,'0');
        let m = fechaBase.getMinutes().toString().padStart(2,'0');
        nuevasHoras.push(`${h}:${m}`);
        fechaBase.setMinutes(fechaBase.getMinutes() + intervalo);
    }
    horasVillaActuales = nuevasHoras;
    const items = ulVilla.querySelectorAll('li');
    items.forEach((li, index) => {
        if (horasVillaActuales[index]) li.querySelector('.hora-villa').textContent = horasVillaActuales[index];
    });
    msgHorario.textContent = "¡Actualizado!";
    setTimeout(() => msgHorario.textContent = "", 2000);
}

function resetearTodo() {
    if (enCurso) { if(!confirm("¿Reiniciar?")) return; location.reload(); return; }
    if (backupListaIzq) listaIzq.value = backupListaIzq;
    if (backupListaDer) listaDer.value = backupListaDer;
    ulVilla.innerHTML = ''; visorIzq.textContent = ""; visorDer.textContent = "";
    indexTabla = 0; indexVilla = 0; contadorTotalSorteados = 0;
    contadorGlobalEl.textContent = "0";
    ganadoresGlobales.clear(); 
    calcularTotalUnidades();
    generarHorarioPorDemanda(); 
    statusIzq.textContent = "LISTO"; statusDer.textContent = "EN ESPERA...";
    btnIniciar.disabled = false;
}

function borrarGanadorInteligente(lista, ganador) {
    if (!ganador) return;
    const norm = s => s.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const meta = norm(ganador);
    for (let i = lista.length - 1; i >= 0; i--) {
        if (norm(lista[i]) === meta) lista.splice(i, 1);
    }
}

window.verificarSiYaGano = function(codigo) {
    if (!codigo) return false;
    const norm = s => s.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return ganadoresGlobales.has(norm(codigo));
};

function registrarGanador(codigo) {
     const norm = s => s.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
     ganadoresGlobales.add(norm(codigo));
}

function limpiarTablaD() {
    if(confirm("¿Limpiar la tabla de Ruta D?")) {
        HORARIO_MAESTRO = []; initTabla(); indexTabla = 0;
    }
}

async function iniciarSecuenciaCompleta() {
    // Aseguramos que la tabla tenga el tamaño correcto antes de empezar
    calcularTotalUnidades();
    generarHorarioPorDemanda();

    const raw = listaIzq.value.trim().split('\n').filter(x => x.trim() !== '');
    const limite = parseInt(inputLimite.value) || 5;
    if (raw.length === 0) { alert("Lista vacía"); return; }

    backupListaIzq = listaIzq.value; backupListaDer = listaDer.value;
    enCurso = true; btnIniciar.disabled = true; btnReset.disabled = true;

    let bolsaJuego = [...raw];
    let ganadores = [];
    ulVilla.innerHTML = ''; indexVilla = 0;
    ganadoresGlobales.clear(); 

    // FASE 1: VILLA
    for (let i = 0; i < limite; i++) {
        const reglaP = window.hayReglaPendiente ? window.hayReglaPendiente(horasVillaActuales[indexVilla], 'VILLA') : false;
        let bolsaDisponible = bolsaJuego;
        if (!reglaP && window.esCodigoReservado) {
            bolsaDisponible = bolsaJuego.filter(c => !window.esCodigoReservado(c));
            if(bolsaDisponible.length === 0) bolsaDisponible = bolsaJuego; 
        }
        if (bolsaDisponible.length === 0 && !reglaP) break;
        
        statusIzq.textContent = `Sorteando ${i+1}/${limite}...`;
        const ganador = await window.animarVisor(visorIzq, bolsaDisponible, 'VILLA');
        
        ganadores.push(ganador);
        registrarGanador(ganador);
        contadorTotalSorteados++; contadorGlobalEl.textContent = contadorTotalSorteados;
        
        const li = document.createElement('li');
        const hora = horasVillaActuales[indexVilla] || "---";
        li.innerHTML = `<span class="hora-villa">${hora}</span> <span class="num-villa">${ganador}</span>`;
        ulVilla.appendChild(li);
        indexVilla++;
        
        borrarGanadorInteligente(bolsaJuego, ganador);
    }
    statusIzq.textContent = "¡VILLA FINALIZADO!";
    
    let textoPrevio = listaDer.value.trim();
    let nuevos = bolsaJuego.join('\n');
    if (textoPrevio !== "") listaDer.value = textoPrevio + "\n" + nuevos;
    else listaDer.value = nuevos;
    listaIzq.value = ganadores.join('\n');
    
    calcularTotalUnidades();
    statusDer.textContent = "Iniciando RUTA D...";
    await new Promise(r => setTimeout(r, 1000));

    let bolsaPrincipal = listaDer.value.trim().split('\n').filter(x => x.trim() !== '');
    for(let g of ganadores) { borrarGanadorInteligente(bolsaPrincipal, g); }

    // LOOP PRINCIPAL CON EXPANSIÓN AUTOMÁTICA
    while (true) {
        let hayRegla = false;
        if (indexTabla < HORARIO_MAESTRO.length) {
            hayRegla = window.hayReglaPendiente ? window.hayReglaPendiente(HORARIO_MAESTRO[indexTabla].h, 'TABLA') : false;
        }
        
        // Si la bolsa está vacía y no hay regla pendiente, paramos
        if (bolsaPrincipal.length === 0 && !hayRegla) break;

        // --- EXPANSIÓN INFINITA: Si se acaba la tabla, creamos más filas ---
        if (indexTabla >= HORARIO_MAESTRO.length) {
            const lastRow = HORARIO_MAESTRO[HORARIO_MAESTRO.length-1];
            const [lh, lm] = lastRow.h.split(':').map(Number);
            let d = new Date(); d.setHours(lh, lm, 0, 0);
            
            // Buscar configuración actual para saber la frecuencia
            const numRangos = parseInt(selNumRangos.value);
            let configs = [];
            for(let i=1; i<=numRangos; i++){
                configs.push({
                    fin: document.getElementById(`r${i}-fin`).value,
                    frec: parseInt(document.getElementById(`r${i}-frec`).value),
                    tipo: document.getElementById(`r${i}-tipo`).value
                });
            }
            let frec = 10;
            let hStr = d.getHours().toString().padStart(2,'0') + ":" + d.getMinutes().toString().padStart(2,'0');
            for(let c of configs) { if(hStr < c.fin) { frec = c.frec; break; } }
            
            d.setMinutes(d.getMinutes() + frec);
            let nh = d.getHours().toString().padStart(2,'0');
            let nm = d.getMinutes().toString().padStart(2,'0');
            
            let tipo = lastRow.t === 'VILLA' ? 'D' : 'VILLA'; 
            let isLock = false;
            const [hB, mB] = inputHoraBloqueo.value.split(':').map(Number);
            const limiteVilla = parseInt(inputLimite.value) || 0;
            const bloqueosActuales = HORARIO_MAESTRO.filter(r => r.lock).length;

            // SOLO BLOQUEAR SI NO SE HA SUPERADO EL LÍMITE DE VILLA
            if (tipo === 'VILLA' && (d.getHours()*60 + d.getMinutes()) >= (hB*60 + mB)) {
                if (bloqueosActuales < limiteVilla) {
                    isLock = true;
                }
            }

            HORARIO_MAESTRO.push({ t: tipo, h: `${nh}:${nm}`, lock: isLock, ganador: null });
            
            const i = HORARIO_MAESTRO.length - 1;
            const item = HORARIO_MAESTRO[i];
            const tr = document.createElement('tr');
            const cTxt = item.t === 'VILLA' ? 'txt-azul' : 'txt-rojo';
            const cCel = item.lock ? 'celda-bloqueada' : 'celda-normal';
            tr.innerHTML = `<td class="${cTxt}">${item.t}</td><td class="${cTxt}">${item.h}</td><td id="celda-${i}" class="${cCel}"></td>`;
            bodyTabla.appendChild(tr);
        }
        // ------------------------------------------

        const horaActualD = HORARIO_MAESTRO[indexTabla].h;
        const reglaPD = window.hayReglaPendiente ? window.hayReglaPendiente(horaActualD, 'TABLA') : false;
        
        let bolsaDisponibleD = bolsaPrincipal;
        if (!reglaPD && window.esCodigoReservado) {
            bolsaDisponibleD = bolsaPrincipal.filter(c => !window.esCodigoReservado(c));
            if(bolsaDisponibleD.length === 0) bolsaDisponibleD = bolsaPrincipal;
        }

        // Si no hay bolsa disponible y no hay regla, paramos (doble check)
        if (bolsaDisponibleD.length === 0 && !reglaPD) break;

        if (HORARIO_MAESTRO[indexTabla].lock === true) { indexTabla++; continue; }
        if (HORARIO_MAESTRO[indexTabla].ganador) { indexTabla++; continue; }

        const ganadorD = await window.animarVisor(visorDer, bolsaDisponibleD, 'TABLA');
        
        registrarGanador(ganadorD);
        contadorTotalSorteados++; contadorGlobalEl.textContent = contadorTotalSorteados;

        HORARIO_MAESTRO[indexTabla].ganador = ganadorD;
        const celda = document.getElementById(`celda-${indexTabla}`);
        if (celda) celda.textContent = ganadorD;
        
        indexTabla++; 
        
        borrarGanadorInteligente(bolsaPrincipal, ganadorD);
        listaDer.value = bolsaPrincipal.join('\n');
    }
    statusDer.textContent = "¡FINALIZADO!";
    enCurso = false; btnReset.disabled = false;
}

window.animarVisor = function(visor, lista, contexto) {
    return new Promise(resolve => {
        let contador = 0; const vueltas = 12; const intervalo = 40; 
        const listaVisual = lista.length > 0 ? lista : ["--", "00"];
        const timer = setInterval(() => {
            const random = listaVisual[Math.floor(Math.random() * listaVisual.length)];
            visor.textContent = random;
            contador++;
            if (contador >= vueltas) {
                clearInterval(timer);
                const final = listaVisual[Math.floor(Math.random() * listaVisual.length)];
                visor.textContent = final; resolve(final);
            }
        }, intervalo);
    });
};

function generarReporteImagen() {
    const repFrecVilla = document.getElementById('rep-frec-villa');
    const repTotal = document.getElementById('rep-total');
    const listaVillaReporte = document.getElementById('lista-villa-reporte');
    const bodyTablaReporte = document.getElementById('body-tabla-reporte');
    
    // USAR CLONACIÓN SEGURA PARA CAPTURA
    const elementoOrigen = document.getElementById('hoja-captura-oculta');
    
    html2canvas(elementoOrigen, {
        scale: 3, // ALTA CALIDAD
        useCORS: true,
        onclone: (clonedDoc) => {
            // Manipular el clon para que sea visible y tenga datos actualizados
            const clon = clonedDoc.getElementById('hoja-captura-oculta');
            clon.style.display = 'block'; 
            clon.style.position = 'static'; // Asegurar que no esté fuera de pantalla en el clon
            
            // Pasar datos al clon
            // Asegurarnos de que los elementos existen antes de asignar (validación defensiva)
            if(clonedDoc.getElementById('rep-frec-villa')) clonedDoc.getElementById('rep-frec-villa').textContent = inputMinutos.value;
            if(clonedDoc.getElementById('rep-total')) clonedDoc.getElementById('rep-total').textContent = contadorTotalSorteados;
            if(clonedDoc.getElementById('lista-villa-reporte')) clonedDoc.getElementById('lista-villa-reporte').innerHTML = ulVilla.innerHTML;
            if(clonedDoc.getElementById('body-tabla-reporte')) clonedDoc.getElementById('body-tabla-reporte').innerHTML = bodyTabla.innerHTML;
        }
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'Reporte_Salidas_Oficial.jpg';
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
    }).catch(err => alert("Error al generar imagen: " + err));
}

// Inicialización
if (!window.hayReglaPendiente) window.hayReglaPendiente = function() { return false; };

// Eventos al cargar
document.addEventListener('DOMContentLoaded', () => {
    actualizarRangosVisibles();
    calcularTotalUnidades();
});