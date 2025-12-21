/**
 * SORTEO FORZADO - Estrategia: Modificar listas antes del sorteo
 */

(function() {
    'use strict';

    let reglas = new Map();
    let activo = false;
    let panelAbierto = false;

    function norm(h) {
        if (!h) return '';
        const p = h.toString().split(':');
        return `${p[0].padStart(2,'0')}:${p[1].padStart(2,'0')}`;
    }

    // UI
    const btn = document.createElement('button');
    btn.innerHTML = '⚙️';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:3px solid white;cursor:pointer;font-size:22px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;';
    btn.onclick = () => {
        panelAbierto = !panelAbierto;
        document.getElementById('panel-sf').style.display = panelAbierto ? 'flex' : 'none';
        document.getElementById('overlay-sf').style.display = panelAbierto ? 'block' : 'none';
    };
    document.body.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.id = 'overlay-sf';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;display:none;';
    overlay.onclick = btn.onclick;
    document.body.appendChild(overlay);

    const panel = document.createElement('div');
    panel.id = 'panel-sf';
    panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;max-width:95vw;background:white;border-radius:15px;box-shadow:0 10px 50px rgba(0,0,0,0.4);z-index:9999;display:none;flex-direction:column;';
    panel.innerHTML = `
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:25px;color:white;">
            <h3 style="margin:0;">🎯 Sorteo Forzado</h3>
            <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">Controla los resultados por hora</p>
        </div>
        <div style="padding:25px;flex:1;overflow-y:auto;">
            <div style="background:#e7f3ff;border-left:4px solid #0d6efd;padding:15px;border-radius:5px;margin-bottom:15px;">
                <div style="font-size:13px;color:#084298;line-height:1.8;">
                    <strong>💡 Cómo funciona:</strong><br>
                    • Escribe la HORA y el CÓDIGO que quieres<br>
                    • Si pones "SORTEO", será aleatorio<br>
                    • <strong>El código NO necesita estar en la lista</strong><br>
                    • Funciona para VILLA y Ruta D
                </div>
            </div>
            <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px;border-radius:5px;margin-bottom:15px;">
                <strong style="color:#856404;">📋 Formato:</strong><br>
                <code style="font-family:monospace;font-size:13px;">05:25&nbsp;&nbsp;&nbsp;&nbsp;E 19<br>05:35&nbsp;&nbsp;&nbsp;&nbsp;SORTEO<br>05:45&nbsp;&nbsp;&nbsp;&nbsp;E 18</code>
            </div>
            <textarea id="txt-sf" style="width:100%;height:200px;border:2px solid #667eea;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;box-sizing:border-box;" placeholder="05:25&#9;E 19&#10;05:35&#9;SORTEO&#10;05:45&#9;E 18"></textarea>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
                <button id="btn-activar" style="background:#198754;color:white;padding:12px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">✅ ACTIVAR</button>
                <button id="btn-limpiar" style="background:#dc3545;color:white;padding:12px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">🗑️ LIMPIAR</button>
            </div>
            <div id="msg-sf" style="margin-top:12px;padding:10px;border-radius:8px;text-align:center;font-weight:bold;display:none;"></div>
            <div id="log-sf" style="margin-top:12px;padding:10px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;max-height:100px;overflow-y:auto;font-family:monospace;font-size:11px;display:none;"></div>
        </div>
        <div style="padding:18px;background:#f8f9fa;border-top:2px solid #dee2e6;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:13px;"><span style="color:#6c757d;">Estado:</span> <span id="dot-sf" style="color:#dc3545;font-weight:bold;">●</span> <span id="estado-sf">Inactivo</span></div>
            <button id="btn-cerrar" style="background:#6c757d;color:white;padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">CERRAR</button>
        </div>
    `;
    document.body.appendChild(panel);

    function activar() {
        const txt = document.getElementById('txt-sf').value.trim();
        if (!txt) { mostrarMsg('⚠️ Escribe tu configuración', 'warning'); return; }

        reglas.clear();
        let n = 0;

        txt.split('\n').forEach(ln => {
            const l = ln.trim();
            if (!l) return;
            const p = l.split(/\s+/);
            if (p.length >= 2) {
                const h = norm(p[0]);
                const c = p.slice(1).join(' ');
                reglas.set(h, c);
                n++;
                addLog(`${h} → ${c}`);
            }
        });

        if (n === 0) { mostrarMsg('❌ Sin reglas válidas', 'error'); return; }

        activo = true;
        document.getElementById('dot-sf').style.color = '#198754';
        document.getElementById('estado-sf').textContent = `Activo (${n})`;
        mostrarMsg(`✅ ${n} reglas activadas`, 'success');
        addLog(`━━━ ACTIVADO ━━━`);
    }

    function desactivar() {
        if (!confirm('¿Desactivar?')) return;
        reglas.clear();
        activo = false;
        document.getElementById('txt-sf').value = '';
        document.getElementById('dot-sf').style.color = '#dc3545';
        document.getElementById('estado-sf').textContent = 'Inactivo';
        document.getElementById('log-sf').style.display = 'none';
        mostrarMsg('🔄 Desactivado', 'info');
    }

    function mostrarMsg(txt, tipo) {
        const el = document.getElementById('msg-sf');
        const c = {
            success: {bg:'#d1e7dd',color:'#0f5132',border:'#198754'},
            error: {bg:'#f8d7da',color:'#842029',border:'#dc3545'},
            warning: {bg:'#fff3cd',color:'#856404',border:'#ffc107'},
            info: {bg:'#cff4fc',color:'#055160',border:'#0dcaf0'}
        }[tipo];
        el.style.background = c.bg;
        el.style.color = c.color;
        el.style.border = `2px solid ${c.border}`;
        el.textContent = txt;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
    }

    function addLog(txt) {
        const el = document.getElementById('log-sf');
        el.style.display = 'block';
        const d = document.createElement('div');
        d.style.padding = '2px 0';
        d.style.borderBottom = '1px dashed #dee2e6';
        d.textContent = txt;
        el.insertBefore(d, el.firstChild);
        if (el.children.length > 12) el.removeChild(el.lastChild);
    }

    document.getElementById('btn-activar').onclick = activar;
    document.getElementById('btn-limpiar').onclick = desactivar;
    document.getElementById('btn-cerrar').onclick = btn.onclick;

    // INTERCEPTACIÓN - Estrategia: Modificar la lista JUSTO ANTES del sorteo
    const intervalo = setInterval(() => {
        if (typeof window.animarVisor === 'function') {
            clearInterval(intervalo);
            
            const originalAnimarVisor = window.animarVisor;
            
            window.animarVisor = function(visor, lista) {
                if (!activo || reglas.size === 0) {
                    return originalAnimarVisor.call(this, visor, lista);
                }

                // Detectar hora
                let hora = null;

                if (visor.id === 'visor-izq') {
                    const idx = window.indexVilla || 0;
                    if (window.horasVillaActuales && window.horasVillaActuales[idx]) {
                        hora = norm(window.horasVillaActuales[idx]);
                    }
                } else if (visor.id === 'visor-der') {
                    const idx = window.indexTabla;
                    if (window.HORARIO_MAESTRO && window.HORARIO_MAESTRO[idx]) {
                        hora = norm(window.HORARIO_MAESTRO[idx].h);
                    }
                }

                if (!hora) {
                    return originalAnimarVisor.call(this, visor, lista);
                }

                const codigo = reglas.get(hora);

                if (!codigo) {
                    return originalAnimarVisor.call(this, visor, lista);
                }

                if (codigo.toUpperCase() === 'SORTEO') {
                    addLog(`🎲 ${hora} SORTEO`);
                    return originalAnimarVisor.call(this, visor, lista);
                }

                // FORZAR: Agregar el código a la lista si no está
                if (!lista.includes(codigo)) {
                    lista.push(codigo);
                }

                // Asegurar que el código forzado sea el único en la lista temporalmente
                const listaOriginal = [...lista];
                lista.length = 0;
                lista.push(codigo);

                addLog(`🎯 ${hora} → ${codigo}`);

                // Llamar al sorteo original (que siempre "ganará" nuestro código)
                const resultado = originalAnimarVisor.call(this, visor, lista);

                // Restaurar la lista original (sin el código forzado si no estaba)
                lista.length = 0;
                listaOriginal.forEach(c => {
                    if (c !== codigo) lista.push(c);
                });

                // Efecto visual
                setTimeout(() => {
                    const b = visor.style.border;
                    const s = visor.style.boxShadow;
                    visor.style.border = '4px solid #ffc107';
                    visor.style.boxShadow = '0 0 20px rgba(255,193,7,0.8)';
                    setTimeout(() => {
                        visor.style.border = b;
                        visor.style.boxShadow = s;
                    }, 1500);
                }, 500);

                return resultado;
            };
            
            console.log('✅ Sorteo forzado instalado');
        }
    }, 100);

})();