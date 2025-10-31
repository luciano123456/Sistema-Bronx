let listaVacia = false;


document.addEventListener("DOMContentLoaded", function () {

    var userSession = JSON.parse(localStorage.getItem('userSession'));

    if (userSession) {
        // Si el usuario está en el localStorage, actualizar el texto del enlace
        var userFullName = userSession.Nombre + ' ' + userSession.Apellido;
        $("#userName").html('<i class="fa fa-user"></i> ' + userFullName); // Cambiar el contenido del enlace

    }

    const liAnalisis = document.getElementById('divAnalisis');
    if (liAnalisis) {
        if (userSession && Number(userSession.IdRol) === 1) {
            liAnalisis.removeAttribute('hidden');   // habilitar para admin
        } else {
            liAnalisis.setAttribute('hidden', 'hidden'); // mantener oculto para el resto
        }
    }
    // Busca todos los elementos con la clase "dropdown-toggle"
    var dropdownToggleList = document.querySelectorAll('.dropdown-toggle');

    // Itera sobre cada elemento y agrega un evento de clic
    dropdownToggleList.forEach(function (dropdownToggle) {
        dropdownToggle.addEventListener('click', function (event) {
            event.preventDefault(); // Evita la acción predeterminada del enlace

            // Obtiene el menú desplegable correspondiente
            var dropdownMenu = dropdownToggle.nextElementSibling;

            // Cambia el atributo "aria-expanded" para alternar la visibilidad del menú desplegable
            var isExpanded = dropdownToggle.getAttribute('aria-expanded') === 'true';
            dropdownToggle.setAttribute('aria-expanded', !isExpanded);
            dropdownMenu.classList.toggle('show'); // Agrega o quita la clase "show" para mostrar u ocultar el menú desplegable
        });
    });

    // Agrega un manejador de eventos de clic al documento para ocultar el menú desplegable cuando se hace clic en cualquier lugar que no sea el menú desplegable
    document.addEventListener('click', function (event) {
        var isDropdownToggle = event.target.closest('.dropdown-toggle'); // Verifica si el elemento clicado es un elemento con la clase "dropdown-toggle"
        var isDropdownMenu = event.target.closest('.dropdown-menu'); // Verifica si el elemento clicado es un menú desplegable

        // Si el elemento clicado no es un menú desplegable ni un elemento con la clase "dropdown-toggle", oculta todos los menús desplegables
        if (!isDropdownToggle && !isDropdownMenu) {
            var dropdownMenus = document.querySelectorAll('.dropdown-menu.show');
            dropdownMenus.forEach(function (dropdownMenu) {
                dropdownMenu.classList.remove('show');
                var dropdownToggle = dropdownMenu.previousElementSibling;
                dropdownToggle.setAttribute('aria-expanded', 'false');
            });
        }
    });
});


function abrirConfiguraciones() {
    $('#ModalEdicionConfiguraciones').modal('show');
    $("#btnGuardarConfiguracion").text("Aceptar");
    $("#modalEdicionLabel").text("Configuraciones");
}


async function listaConfiguracion() {
    const url = `/${controllerConfiguracion}/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) throw new Error('Error al cargar configuraciones');

    return data.map(configuracion => ({
        Id: configuracion.Id,
        Nombre: configuracion.Nombre,
        NombreCombo: configuracion.NombreCombo
    }));
}




async function abrirConfiguracion(_nombreConfiguracion, _controllerConfiguracion, _comboNombre = null, _comboController = null, _lblComboNombre) {

    try {

        nombreConfiguracion = _nombreConfiguracion;
        controllerConfiguracion = _controllerConfiguracion,
            comboNombre = _comboNombre,
            comboController = _comboController,
            lblComboNombre = _lblComboNombre;

        var result = await llenarConfiguraciones()

        if (!result) {
            await errorModal("Ha ocurrido un error al cargar la lista")
            return;
        }

        $('#ModalEdicionConfiguraciones').modal('hide');
        $('#modalConfiguracion').modal('show');

        cancelarModificarConfiguracion();

        $('#txtNombreConfiguracion').on('input', function () {
            validarCamposConfiguracion()
        });


        $('#cmbConfiguracion').on('change', function () {
            validarCamposConfiguracion()
        });


        document.getElementById("modalConfiguracionLabel").innerText = "Configuracion de " + nombreConfiguracion;
    } catch (ex) {
        errorModal("Ha ocurrido un error al cargar la lista")
    }

}

async function editarConfiguracion(id) {
    fetch(controllerConfiguracion + "/EditarInfo?id=" + id, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    })
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => {
            if (dataJson !== null) {

                document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Modificar";
                document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
                document.getElementById("txtNombreConfiguracion").value = dataJson.Nombre;
                document.getElementById("txtIdConfiguracion").value = dataJson.Id;

                document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");

                if (comboNombre != null) {
                    document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
                    document.getElementById("cmbConfiguracion").value = dataJson.IdCombo;
                }

                validarCamposConfiguracion();
            } else {
                throw new Error("Ha ocurrido un error.");
            }
        })
        .catch(error => {
            errorModal("Ha ocurrido un error.");
        });
}


async function llenarConfiguraciones() {
    try {
        let configuraciones = await listaConfiguracion();

        if (comboNombre != null) {
            llenarComboConfiguracion();
            document.getElementById("divConfiguracionCombo").removeAttribute("hidden", "");
        } else {
            document.getElementById("divConfiguracionCombo").setAttribute("hidden", "hidden");
        }

        const lblVacia = document.getElementById("lblListaVacia");
        $("#configuracion-list").empty();
        lblVacia.innerText = "";
        lblVacia.hidden = true;

        if (!configuraciones || configuraciones.length === 0) {
            lblVacia.innerText = `La lista de ${nombreConfiguracion} está vacía.`;
            lblVacia.style.color = "red";
            lblVacia.hidden = false;
            listaVacia = true;
            return true;
        }

        listaVacia = false;

        configuraciones.forEach((configuracion, index) => {
            let nombreConfig = configuracion.Nombre || "";
            if (configuracion.NombreCombo) nombreConfig += " - " + configuracion.NombreCombo;

            const id = configuracion.Id;

            $("#configuracion-list").append(`
        <div class="list-item" data-id="${id}" data-busqueda="${(nombreConfig || '').toLowerCase()}">
          <span class="list-item__text">${nombreConfig}</span>
          <div class="item-actions">
            <button type="button" class="icon-btn edit" title="Editar" onclick="editarConfiguracion(${id})">
              <i class="fa fa-pencil-square-o"></i>
            </button>
            <button type="button" class="icon-btn delete" title="Eliminar" onclick="eliminarConfiguracion(${id})">
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
      `);
        });

        return true;
    } catch (ex) {
        return false;
    }
}


async function eliminarConfiguracion(id) {


    let resultado = await confirmarModal("¿Desea eliminar el/la" + nombreConfiguracion + "?");
    if (!resultado) return;

    if (resultado) {
        try {
            const response = await fetch(controllerConfiguracion + "/Eliminar?id=" + id, {
                method: "DELETE",
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error("Error al eliminar " + nombreConfiguracion);
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                llenarConfiguraciones()

                exitoModal(nombreConfiguracion + " eliminada correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}


async function llenarComboConfiguracion() {
    const res = await fetch(`${comboController}/Lista`, {
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) throw new Error('Error al cargar combo');

    const data = await res.json();
    llenarSelect("cmbConfiguracion", data);
}

function validarCamposConfiguracion() {
    const nombre = $("#txtNombreConfiguracion").val();
    const combo = $("#cmbConfiguracion").val();

    const camposValidos = nombre !== "";
    const selectValido = combo !== "";

    // estilos
    $("#lblNombreConfiguracion").css("color", camposValidos ? "" : "red");
    $("#txtNombreConfiguracion").css("border-color", camposValidos ? "" : "red");
    $("#cmbConfiguracion").css("border-color", selectValido ? "" : "red");

    // lógica de validación
    if (comboNombre != null) {
        return camposValidos && selectValido;
    } else {
        return camposValidos;
    }
}


function guardarCambiosConfiguracion() {
    if (validarCamposConfiguracion()) {
        const idConfiguracion = $("#txtIdConfiguracion").val();
        const idCombo = $("#cmbConfiguracion").val();
        const nuevoModelo = {
            "Id": idConfiguracion !== "" ? idConfiguracion : 0,
            "IdCombo": comboNombre !== "" ? idCombo : 0,
            "Nombre": $("#txtNombreConfiguracion").val(),
        };

        const url = idConfiguracion === "" ? controllerConfiguracion + "/Insertar" : controllerConfiguracion + "/Actualizar";
        const method = idConfiguracion === "" ? "POST" : "PUT";

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                const mensaje = idConfiguracion === "" ? nombreConfiguracion + " registrado/a correctamente" : nombreConfiguracion + " modificado/a correctamente";
                llenarConfiguraciones()
                cancelarModificarConfiguracion();
                exitoModal(mensaje)
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}

function cancelarModificarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    document.getElementById("contenedorNombreConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("agregarConfiguracion").removeAttribute("hidden");

    if (listaVacia == true) {
        document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
        document.getElementById("lblListaVacia").style.color = 'red';
        document.getElementById("lblListaVacia").removeAttribute("hidden");
    }
}

function agregarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");
    document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("lblListaVacia").innerText = "";
    document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");
    document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Agregar";

    $('#lblNombreConfiguracion').css('color', 'red');
    $('#txtNombreConfiguracion').css('border-color', 'red');

    if (comboNombre != null) {
        document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
        document.getElementById("cmbConfiguracion").value = "";
        $('#cmbConfiguracion').css('border-color', 'red');
    }

}


  // ======= Tema =======
  const CFG_THEME_KEY = 'cfg_theme_modal_config';
  const CFG_COMPACT_KEY = 'cfg_compact_modal_config';

  function applyConfigTheme(themeClass) {
    const modal = document.getElementById('modalConfiguracion');
    if (!modal) return;
    ['theme-indigo','theme-cyan','theme-emerald'].forEach(t => modal.classList.remove(t));
    modal.classList.add(themeClass);
    try { localStorage.setItem(CFG_THEME_KEY, themeClass); } catch {}
  }

  function setConfigCompact(isOn) {
    const cont = document.querySelector('#modalConfiguracion .list-container');
    if (cont) cont.classList.toggle('compact', !!isOn);
    document.querySelectorAll('#configuracion-list .config-item, #configuracion-list .list-item')
      .forEach(el => el.classList.toggle('compact', !!isOn));
    try { localStorage.setItem(CFG_COMPACT_KEY, isOn ? '1':'0'); } catch {}
  }

  // Restaura preferencias cuando se abre el modal
  document.getElementById('modalConfiguracion')?.addEventListener('show.bs.modal', () => {
    const savedTheme = localStorage.getItem(CFG_THEME_KEY) || 'theme-indigo';
    applyConfigTheme(savedTheme);

    const savedCompact = localStorage.getItem(CFG_COMPACT_KEY) === '1';
    const sw = document.getElementById('switchCompacto');
    if (sw) { sw.checked = savedCompact; }
    setConfigCompact(savedCompact);
  });

  // ======= Filtro local =======
  function filtrarConfiguracionesLocal(texto) {
    const q = (texto || '').toString().trim().toLowerCase();
    const list = document.getElementById('configuracion-list');
    const vacio = document.getElementById('lblListaVacia');
    if (!list) return;

    let visibles = 0;
    const items = list.querySelectorAll('.config-item, .list-item');
    items.forEach(it => {
      const txt = it.textContent ? it.textContent.toLowerCase() : '';
      const match = !q || txt.includes(q);
      it.style.display = match ? '' : 'none';
      if (match) visibles++;
    });

    if (vacio) vacio.hidden = visibles !== 0;
  }

    document.querySelectorAll('.nav-item.dropdown').forEach(dropdown => {
        dropdown.addEventListener('mouseenter', function () {
            const dropdownMenu = this.querySelector('.dropdown-menu');
            dropdownMenu.classList.add('show'); // Mostrar el dropdown
        });

        dropdown.addEventListener('mouseleave', function () {
            const dropdownMenu = this.querySelector('.dropdown-menu');
            dropdownMenu.classList.remove('show'); // Ocultar el dropdown
        });
    });

/* =========================================================
0) Anti beforeunload (mata el popup nativo en todo el sitio)
========================================================= */
(function killBeforeUnload() {
    // 1) Capturamos el evento y cortamos propagación
    window.addEventListener('beforeunload', function (e) {
        // NO seteamos returnValue → NO hay diálogo
        e.stopImmediatePropagation();
    }, { capture: true });

    // 2) Ignoramos registros futuros a beforeunload
    const _add = window.addEventListener;
    window.addEventListener = function (type, listener, opts) {
        if (type === 'beforeunload') return; // ignorar
        return _add.call(this, type, listener, opts);
    };

    // 3) Neutralizamos la propiedad onbeforeunload
    try { window.onbeforeunload = null; } catch (e) { }
    try {
        Object.defineProperty(window, 'onbeforeunload', {
            configurable: true,
            get() { return null; },
            set(_) { /* noop */ }
        });
    } catch (_) { }
})();

/* =========================================================
   1) Utilidades
   ========================================================= */
const NAV_DEST_KEY = '__NAV_DEST_POST_SAVE__';

function esVistaPedidoNuevoModif() {
    const segs = (location.pathname || '').toLowerCase().split('/').filter(Boolean);
    for (let i = 0; i < segs.length - 1; i++) {
        if (segs[i] === 'pedidos' && segs[i + 1] === 'nuevomodif') return true;
    }
    return false;
}



function resolverDestinoSeguro(href) {
    if (!href || href === '#' || /^\s*javascript:/i.test(href)) return null;
    try {
        const u = new URL(href, location.origin);
        if (u.origin !== location.origin) return null;
        if (!/^https?:$/.test(u.protocol)) return null;
        return u.toString();
    } catch {
        return null;
    }
}

function navegarAhora(url) {
    // No hay beforeunload, navegamos directo
    setTimeout(() => location.assign(url), 10);
}

/* =========================================================
   2) Modal (usa TU modal ya existente)
   Devuelve 'guardar' | 'salir' | 'quedarse'
   ========================================================= */
async function abrirModalGuardarOSalir(mensaje, esNuevo) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalGuardarSalir');
        const lblMsg = document.getElementById('modalGuardarSalirMensaje');
        const btnOK = document.getElementById('btnGuardarYSalir');
        const btnCX = document.getElementById('btnCancelarYSALIR');

        if (!modalEl || !lblMsg || !btnOK || !btnCX) {
            console.error('Falta el modal #modalGuardarSalir o sus botones.');
            resolve('quedarse');
            return;
        }

        lblMsg.textContent = mensaje || (esNuevo
            ? 'Estás saliendo del pedido nuevo. ¿Deseás registrar el pedido antes de irte?'
            : 'Estás saliendo del pedido. ¿Deseás guardar antes de irte?');

        btnOK.textContent = esNuevo ? 'Registrar y salir' : 'Guardar y salir';

        // Evitar listeners duplicados clonando botones
        const okCl = btnOK.cloneNode(true);
        const cxCl = btnCX.cloneNode(true);
        btnOK.parentNode.replaceChild(okCl, btnOK);
        btnCX.parentNode.replaceChild(cxCl, btnCX);

        // Bootstrap 5: getOrCreateInstance
        const bs = bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: 'static', keyboard: false });
        let decision = null;

        modalEl.addEventListener('hidden.bs.modal', () => resolve(decision || 'quedarse'), { once: true });
        okCl.addEventListener('click', () => { decision = 'guardar'; bs.hide(); }, { once: true });
        cxCl.addEventListener('click', () => { decision = 'salir'; bs.hide(); }, { once: true });

        bs.show();
    });
}

/* =========================================================
   3) Guard hook para redirección post-guardar (OPCIONAL)
   Llamalo al FINAL de tu guardar exitoso: _redirigirDespuesDeGuardar();
   ========================================================= */
window._redirigirDespuesDeGuardar = function () {
    const dest = sessionStorage.getItem(NAV_DEST_KEY);
    if (!dest) return;
    sessionStorage.removeItem(NAV_DEST_KEY);
    navegarAhora(dest);
};

/* =========================================================
   4) API pública: navTo(anchor)  — también instalamos delegación
   ========================================================= */
async function navTo(anchorEl) {
    const destino = resolverDestinoSeguro(anchorEl.getAttribute('href'));
    if (!destino) return false;

    // Si NO estamos en Nuevo/Modif → navegar directo
    if (!esVistaPedidoNuevoModif()) { navegarAhora(destino); return false; }

    // En Nuevo/Modif SIEMPRE validamos
    const esNuevo = (document.getElementById('IdPedido')?.value || '') === '';
    const eleccion = await abrirModalGuardarOSalir(null, esNuevo);

    if (eleccion === 'guardar') {
        // Guardar y luego ir al destino elegido
        sessionStorage.setItem(NAV_DEST_KEY, destino);
        const pathAntes = location.pathname;

        try {
            const ret = window.guardarCambios && await window.guardarCambios(false);
            // Si devolver Promise, esperamos
            if (ret && typeof ret.then === 'function') {
                await ret;
            } else {
                window.errorModal && window.errorModal('No se pudo guardar el pedido.');
                return;
            }
            // Si tu guardar NO redirigió ni llamó al hook, lo hacemos nosotros:
            setTimeout(() => {
                const dest = sessionStorage.getItem(NAV_DEST_KEY);
                if (dest && location.pathname === pathAntes) {
                    sessionStorage.removeItem(NAV_DEST_KEY);
                    navegarAhora(destino);
                }
            }, 300); // pequeño delay para dejar terminar animaciones/modals
        } catch (e) {
            console.error('Error en guardarCambios():', e);
            sessionStorage.removeItem(NAV_DEST_KEY);
            window.errorModal && window.errorModal('No se pudo guardar el pedido.');
        }
    } else if (eleccion === 'salir') {
        navegarAhora(destino); // salir sin guardar
    }
    // 'quedarse' => no hacemos nada

    return false; // siempre cancelamos el default del <a>
}
window.navTo = navTo;

/* =========================================================
   5) Delegación en el navbar (no necesitás tocar los <a>)
   - Intercepta clicks en nav.navbar para .nav-link y .dropdown-item
   - Ignora toggles de dropdown
   ========================================================= */
(function instalarDelegacionNavbar() {
    const navbar = document.querySelector('nav.navbar');
    if (!navbar) return;

    navbar.addEventListener('click', function (ev) {
        const a = ev.target.closest('a[href]');
        if (!a) return;
        if (a.classList.contains('dropdown-toggle')) return; // solo abre el menú
        const href = a.getAttribute('href');
        if (!href || href === '#' || /^\s*javascript:/i.test(href)) return;

        ev.preventDefault();
        ev.stopPropagation();
        navTo(a);
    }, true); // captura para adelantar al resto
})();
