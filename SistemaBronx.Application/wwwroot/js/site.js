﻿async function MakeAjax(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}


async function MakeAjaxFormData(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: false,
        contentType: false,
        isFormData: true,
        processData: false
    });
}

function confirmarModal(mensaje) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalConfirmar');
        const mensajeEl = document.getElementById('modalConfirmarMensaje');
        const btnAceptar = document.getElementById('btnModalConfirmarAceptar');

        mensajeEl.innerText = mensaje;

        const modal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });

        // Flag para que no resuelva dos veces
        let resuelto = false;

        // Limpia todos los listeners anteriores
        modalEl.replaceWith(modalEl.cloneNode(true));
        // Re-obtener referencias luego de clonar
        const nuevoModalEl = document.getElementById('modalConfirmar');
        const nuevoBtnAceptar = document.getElementById('btnModalConfirmarAceptar');

        const nuevoModal = new bootstrap.Modal(nuevoModalEl, {
            backdrop: 'static',
            keyboard: false
        });

        nuevoBtnAceptar.onclick = function () {
            if (resuelto) return;
            resuelto = true;
            resolve(true);
            nuevoModal.hide();
        };

        nuevoModalEl.addEventListener('hidden.bs.modal', () => {
            if (resuelto) return;
            resuelto = true;
            resolve(false);
        }, { once: true });

        nuevoModal.show();
    });
}


// Modal con cierre correcto y resolución post-hidden
async function abrirModalGuardarOSalir(mensaje, esNuevo) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalGuardarSalir');
        const lblMsg = document.getElementById('modalGuardarSalirMensaje');
        const btnOK = document.getElementById('btnGuardarYSalir');
        const btnCancel = document.getElementById('btnCancelarYSALIR');

        // set textos
        lblMsg.innerText = mensaje || (esNuevo
            ? 'Estás saliendo del pedido nuevo. ¿Deseás registrar el pedido antes de irte?'
            : 'Tenés cambios sin guardar. ¿Deseás guardar el pedido antes de salir?');
        btnOK.textContent = esNuevo ? 'Registrar y salir' : 'Guardar y salir';

        // evitar listeners duplicados
        const okCl = btnOK.cloneNode(true);
        const cxCl = btnCancel.cloneNode(true);
        btnOK.parentNode.replaceChild(okCl, btnOK);
        btnCancel.parentNode.replaceChild(cxCl, btnCancel);

        const bsModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

        let decision = null; // 'guardar' | 'salir' | 'quedarse'

        // Siempre resolvemos DESPUÉS de que el modal se cierre
        modalEl.addEventListener('hidden.bs.modal', () => {
            resolve(decision || 'quedarse');
        }, { once: true });

        okCl.addEventListener('click', () => {
            decision = 'guardar';
            bsModal.hide(); // ⬅️ cerrar modal
        }, { once: true });

        cxCl.addEventListener('click', () => {
            decision = 'salir';
            bsModal.hide(); // ⬅️ cerrar modal
        }, { once: true });

        // Si tocan la X, queda 'quedarse'
        // (no hace falta setear decision)

        bsModal.show();
    });
}


function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$0.00"; // Devuelve un valor predeterminado si 'number' no es válido
    }

    // Asegúrate de que el número tenga dos decimales
    const parts = number.toFixed(2).split(".");

    // Formatea la parte entera con puntos como separadores de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Combina la parte entera y la parte decimal
    return "$" + parts.join(",");
}


function mostrarModalConContador(modal, texto, tiempo) {
    $(`#${modal}Text`).text(texto);
    $(`#${modal}`).modal('show');

    setTimeout(function () {
        $(`#${modal}`).modal('hide');
    }, tiempo);
}

function exitoModal(texto) {
    mostrarModalConContador('exitoModal', texto, 1000);
}

function errorModal(texto) {
    mostrarModalConContador('ErrorModal', texto, 3000);
}

function advertenciaModal(texto) {
    mostrarModalConContador('AdvertenciaModal', texto, 3000);
}
const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS', // Cambia "ARS" por el código de moneda que necesites
    minimumFractionDigits: 2
});

function convertirMonedaAFloat(moneda) {
    // Eliminar el símbolo de la moneda y otros caracteres no numéricos
    const soloNumeros = moneda.replace(/[^0-9,.-]/g, '');

    // Eliminar separadores de miles y convertir la coma en punto
    const numeroFormateado = soloNumeros.replace(/\./g, '').replace(',', '.');

    // Convertir a flotante
    const numero = parseFloat(numeroFormateado);

    // Devolver el número formateado como cadena, asegurando los decimales
    return numero.toFixed(2); // Asegura siempre dos decimales en la salida
}
function convertirAMonedaDecimal(valor) {
    // Reemplazar coma por punto
    if (typeof valor === 'string') {
        valor = valor.replace(',', '.'); // Cambiar la coma por el punto
    }
    // Convertir a número flotante
    return parseFloat(valor);
}


function formatoNumero(valor) {
    // Reemplaza la coma por punto y elimina otros caracteres no numéricos (como $)
    return parseFloat(valor.replace(/[^0-9,]+/g, '').replace(',', '.')) || 0;
}

function parseDecimal(value) {
    return parseFloat(value.replace(',', '.'));
}


function formatMoneda(valor) {
    // Convertir a string, cambiar el punto decimal a coma y agregar separadores de miles
    let formateado = valor
        .toString()
        .replace('.', ',') // Cambiar punto decimal a coma
        .replace(/\B(?=(\d{3})+(?!\d))/g, "."); // Agregar separadores de miles

    // Agregar el símbolo $ al inicio
    return `$${formateado}`;
}


function toggleAcciones(id) {
    const dropdown = document.querySelector(`.acciones-menu[data-id='${id}'] .acciones-dropdown`);
    const isVisible = dropdown.style.display === 'block';

    // Oculta todos los demás menús desplegables
    document.querySelectorAll('.acciones-dropdown').forEach(el => el.style.display = 'none');

    if (!isVisible) {
        // Muestra el menú
        dropdown.style.display = 'block';

        // Obtén las coordenadas del botón
        const menuButton = document.querySelector(`.acciones-menu[data-id='${id}']`);
        const rect = menuButton.getBoundingClientRect();

        // Mueve el menú al body y ajusta su posición
        const dropdownClone = dropdown.cloneNode(true);
        dropdownClone.style.position = 'fixed';
        dropdownClone.style.left = `${rect.left}px`;
        dropdownClone.style.top = `${rect.bottom}px`;
        dropdownClone.style.zIndex = '10000';
        dropdownClone.style.display = 'block';

        // Limpia menús previos si es necesario
        document.querySelectorAll('.acciones-dropdown-clone').forEach(clone => clone.remove());

        dropdownClone.classList.add('acciones-dropdown-clone');
        document.body.appendChild(dropdownClone);
    }
}


function guardarFiltrosPantalla(idTabla, nombreEstado, soloPosicion = false) {
    const tabla = $(idTabla).DataTable();
    const estado = {
        page: tabla.page.info().page,
        search: tabla.search(),
        scrollY: window.scrollY,
        filtros: {},              // Por índice
        filtrosPorNombre: {},     // Por nombre
        columnasVisibles: []      // Estado de visibilidad
    };

    // Visibilidad de columnas
    tabla.columns().every(function (index) {
        estado.columnasVisibles.push(this.visible());
    });

    if (!soloPosicion) {
        const headers = document.querySelectorAll(`${idTabla} thead tr:not(.filters) th`);

        $('.filters th').each(function (index) {
            const filtro = this.querySelector('input, select');
            if (!filtro) return;

            const visible = estado.columnasVisibles[index];
            if (index === 0) return; // Evitar columna 0 o columnas ocultas

            const valor = filtro.tagName === 'SELECT' ? $(filtro).val() : filtro.value;
            const nombre = headers[index]?.textContent?.trim() || `col_${index}`;

            estado.filtros[index] = valor;
            estado.filtrosPorNombre[nombre] = valor;
        });
    }

    localStorage.setItem(nombreEstado, JSON.stringify(estado));
}



async function aplicarFiltrosRestaurados(api, idTabla, nombreEstado, soloPosicion = false) {
    const estado = JSON.parse(localStorage.getItem(nombreEstado));
    if (!estado) return;

   
    // Restaurar paginado, búsqueda global y visibilidad
    if (estado.page !== undefined) api.page(estado.page);
    if (estado.columnasVisibles) {
        estado.columnasVisibles.forEach((visible, i) => {
            api.column(i).visible(visible);
        });
    }
    if (estado.search) api.search(estado.search);
    api.draw(false);

    setTimeout(() => {
        window.scrollTo(0, estado.scrollY || 0);
    }, 100);

    localStorage.removeItem(nombreEstado);
}



// 1) Parsear string (con $, puntos, comas) -> Número JS
function formatearSinMiles(valor) {
    if (valor == null) return 0;

    // Dejar solo dígitos, coma, punto y signo
    let s = String(valor).replace(/[^\d.,-]/g, '').trim();
    if (s === '' || s === '-') return 0;

    const hasDot = s.includes('.');
    const hasComma = s.includes(',');

    if (hasDot && hasComma) {
        // Caso típico AR: 162.888,00 -> 162888.00
        s = s.replace(/\./g, '').replace(/,/g, '.');
    } else if (hasComma) {
        // 162,89 -> 162.89
        s = s.replace(/,/g, '.');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

// 2) Formatear Número/entrada -> string "es-AR" con miles y 2 decimales (sin símbolo)
function formatearMiles(valor) {
    const n = typeof valor === 'number' ? valor : formatearSinMiles(valor);
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearARS(valor) {
    const n = (typeof valor === 'number') ? valor : formatearSinMiles(valor);

    // Si es inválido o cero, devolvé 0 (número)
    if (!Number.isFinite(n) || n === 0) return 0;

    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(n);
}
