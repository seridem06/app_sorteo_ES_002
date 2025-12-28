(function() {
    'use strict';
    
    // Almacenes de reglas
    let reglasVilla = new Map();
    let reglasTabla = new Map();
    let ventanaControl = null;

    document.addEventListener('keydown', function(e) {
        if (e.key === 'F9') {
            e.preventDefault();
            abrirPanelControl();
        }
    });

    function abrirPanelControl() {
        if (ventanaControl && !ventanaControl.closed) {
            ventanaControl.focus();
            return;
        }

        ventanaControl = window.open("", "ControlSorteo", "width=500,height=600,menubar=no,toolbar=no,location=no,status=no");
        
        if (!ventanaControl) {
            alert("⚠️ Habilita las ventanas emergentes (popups).");
            return;
        }

        const doc = ventanaControl.document;
        doc.open();
        doc.write(`
            <html>
            <head>
                <title>Centro de Mando</title>
                <style>
                    body { font-family: monospace; background: #222; color: #0f0; padding: 15px; }
                    .col { width: 48%; display: inline-block; vertical-align: top; }
                    h3 { border-bottom: 1px solid #444; padding-bottom: 5px; color:#fff; text-align:center; }
                    textarea { width: 100%; height: 250px; background: #000; color: #fff; border: 1px solid #555; font-size: 13px; padding: 5px; }
                    button { width: 100%; padding: 12px; margin-top: 15px; cursor: pointer; font-weight: bold; font-size:14px; }
                    .btn-send { background: #006400; color: #fff; border: none; }
                    .log { margin-top: 15px; font-size: 11px; color: #888; border-top: 1px solid #333; padding-top: 5px; }
                </style>
            </head>
            <body>
                <h2 style="text-align:center; margin:0 0 15px 0; color:#fff;">🎮 PANEL DE CONTROL</h2>
                
                <div class="col">
                    <h3>VILLA</h3>
                    <div style="font-size:10px; color:#aaa; text-align:center;">HORA CÓDIGO</div>
                    <textarea id="txtVilla" placeholder="05:48 E-20"></textarea>
                </div>
                
                <div class="col">
                    <h3>RUTA D</h3>
                    <div style="font-size:10px; color:#aaa; text-align:center;">HORA CÓDIGO</div>
                    <textarea id="txtTabla" placeholder="06:00 B-15"></textarea>
                </div>

                <button class="btn-send" onclick="enviarDatos()">💾 GUARDAR REGLAS</button>
                <div id="log" class="log">Esperando comandos...</div>

                <script>
                    function enviarDatos() {
                        const v = document.getElementById('txtVilla').value;
                        const t = document.getElementById('txtTabla').value;
                        
                        if(window.opener && !window.opener.closed) {
                            window.opener.recibirReglasExternas(v, t);
                            log("Reglas actualizadas en el sistema.");
                        } else {
                            log("❌ Error: Ventana principal cerrada.");
                        }
                    }
                    function log(m) {
                        const d = new Date();
                        const h = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
                        document.getElementById('log').innerHTML = '['+h+'] ' + m + '<br>' + document.getElementById('log').innerHTML;
                    }
                    // Cargar datos previos
                    if(window.opener && window.opener.obtenerReglasRaw) {
                        const data = window.opener.obtenerReglasRaw();
                        document.getElementById('txtVilla').value = data.v;
                        document.getElementById('txtTabla').value = data.t;
                    }
                </script>
            </body>
            </html>
        `);
        doc.close();
    }

    let rawVilla = "";
    let rawTabla = "";

    window.recibirReglasExternas = function(txtVilla, txtTabla) {
        rawVilla = txtVilla;
        rawTabla = txtTabla;
        
        reglasVilla.clear();
        reglasTabla.clear();

        procesarReglas(txtVilla, reglasVilla);
        procesarReglas(txtTabla, reglasTabla);
        
        console.log(`✅ Reglas actualizadas: Villa(${reglasVilla.size}), RutaD(${reglasTabla.size})`);
    };

    window.obtenerReglasRaw = function() {
        return { v: rawVilla, t: rawTabla };
    };

    // NUEVO: Función para saber si un código está reservado para el futuro
    window.esCodigoReservado = function(codigo) {
        if (!codigo) return false;
        const norm = s => s.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const meta = norm(codigo);

        // Buscar en todas las reglas activas
        for (let c of reglasVilla.values()) {
            if (norm(c) === meta && c.toUpperCase() !== 'SORTEO') return true;
        }
        for (let c of reglasTabla.values()) {
            if (norm(c) === meta && c.toUpperCase() !== 'SORTEO') return true;
        }
        return false;
    };

    function procesarReglas(texto, mapa) {
        const lineas = texto.split('\n');
        lineas.forEach(l => {
            const parts = l.trim().split(/\s+/);
            if (parts.length >= 2) {
                let h = parts[0];
                if(h.indexOf(':') === 1) h = '0' + h;
                const c = parts.slice(1).join(' ');
                mapa.set(h, c);
            }
        });
    }

    // --- INTERCEPTOR ---
    if (typeof window.animarVisor === 'function') {
        const originalAnimarVisor = window.animarVisor;

        window.animarVisor = function(visor, lista, contexto) {
            let horaTarget = null;
            let codigoForzado = null;

            // 1. Determinar contexto y hora
            if (contexto === 'VILLA') {
                if (window.horasVillaActuales && typeof window.indexVilla !== 'undefined') {
                    horaTarget = window.horasVillaActuales[window.indexVilla];
                    if (horaTarget && horaTarget.length === 4) horaTarget = '0' + horaTarget;
                    codigoForzado = reglasVilla.get(horaTarget);
                }
            } else if (contexto === 'TABLA') {
                if (window.HORARIO_MAESTRO && typeof window.indexTabla !== 'undefined') {
                    if (window.HORARIO_MAESTRO[window.indexTabla]) {
                        horaTarget = window.HORARIO_MAESTRO[window.indexTabla].h;
                        if (horaTarget && horaTarget.length === 4) horaTarget = '0' + horaTarget;
                        codigoForzado = reglasTabla.get(horaTarget);
                    }
                }
            }

            // 2. Aplicar Trampa (Ahora con permiso para repetir si es forzado explícitamente)
            if (codigoForzado && codigoForzado.toUpperCase() !== 'SORTEO') {
                
                // Si está forzado, IGNORAMOS si ya ganó. La orden manual manda.
                console.log(`🤫 Forzando (${contexto}) ${horaTarget}: ${codigoForzado}`);
                
                let listaAnimacion = [...lista];
                // Si la lista está vacía o filtrada, ponemos basura visual para que gire
                if (listaAnimacion.length === 0) listaAnimacion = ["--", "00", "??"];

                if (!listaAnimacion.includes(codigoForzado)) {
                    listaAnimacion.push(codigoForzado);
                }
                
                return new Promise(resolve => {
                    let count = 0;
                    const timer = setInterval(() => {
                        visor.textContent = listaAnimacion[Math.floor(Math.random() * listaAnimacion.length)];
                        count++;
                        if (count > 10) {
                            clearInterval(timer);
                            visor.textContent = codigoForzado; 
                            // Asegurar que existe en la lista para que el script principal lo pueda borrar/procesar
                            if (!lista.includes(codigoForzado)) {
                                lista.push(codigoForzado);
                            }
                            resolve(codigoForzado);
                        }
                    }, 40);
                });
            }

            // Si es sorteo normal, usamos la lista tal cual (que ya vendrá filtrada por index.html)
            return originalAnimarVisor(visor, lista, contexto);
        };

        window.hayReglaPendiente = function(hora, contexto) {
            if (!hora) return false;
            if (hora.length === 4) hora = '0' + hora;
            
            let codigo = null;
            if (contexto === 'VILLA') codigo = reglasVilla.get(hora);
            if (contexto === 'TABLA') codigo = reglasTabla.get(hora);
            
            return (codigo !== undefined && codigo !== null);
        };
    }
})();