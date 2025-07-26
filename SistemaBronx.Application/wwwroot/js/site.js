async function MakeAjax(options) {
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
        filtros: {},
        columnasVisibles: []
    };

    // Guardar visibilidad de columnas
    tabla.columns().every(function (index) {
        estado.columnasVisibles.push(this.visible());
    });

    if (!soloPosicion) {
        // Guardar filtros de columnas visibles (excepto columna 0)
        $('.filters th').each(function (index) {
            const filtro = this.querySelector('input, select');
            if (!filtro) return;

            const visible = estado.columnasVisibles[index];
            if (visible && index !== 0) {
                estado.filtros[index] = $(filtro).val();
            }
        });
    }

    localStorage.setItem(nombreEstado, JSON.stringify(estado));
}


async function aplicarFiltrosRestaurados(api, idTabla, nombreEstado, soloPosicion = false) {
    const estadoGuardado = JSON.parse(localStorage.getItem(nombreEstado));
    if (!estadoGuardado) return;


    if (!soloPosicion) {
        for (const [indexStr, valor] of Object.entries(estadoGuardado.filtros || {})) {
            const index = parseInt(indexStr);

            const th = document.querySelector(`${idTabla} thead tr.filters th:nth-child(${index + 1})`);
            const filtro = th?.querySelector('input, select');
            if (!filtro) continue;

            // SELECT2
            if (filtro.tagName === 'SELECT') {
                const valores = Array.isArray(valor) ? valor : [valor];

                // 1. Asignar los valores guardados
                $(filtro).val(valores).trigger('change.select2');

                // 2. Aplicar filtro en la tabla
                if (valores.length > 0) {
                    const regex = '^(' + valores.map(v => $.fn.dataTable.util.escapeRegex(v)).join('|') + ')$';
                    api.column(index).search(regex, true, false);
                } else {
                    api.column(index).search('', true, false);
                }

                // 3. 🔁 FORZAR REASIGNACIÓN LUEGO DEL DRAW (por si select2 no los dibuja)
                setTimeout(() => {
                    $(filtro).val(valores).trigger('change.select2');
                }, 100);

            }

            // INPUT TEXT
            if (filtro.tagName === 'INPUT') {
                filtro.value = valor;
                filtro.placeholder = ''; // quitar "Buscar..."
                const regexr = '(((' + valor + ')))';
                api.column(index).search(valor ? regexr : '', valor !== '', valor === '');
            }
        }
    }

    // Restaurar página
    if (estadoGuardado.page !== undefined) {
        api.page(estadoGuardado.page);
    }

    // Restaurar visibilidad columnas
    if (estadoGuardado.columnasVisibles) {
        estadoGuardado.columnasVisibles.forEach((visible, i) => {
            api.column(i).visible(visible);
        });
    }

    // Búsqueda global
    if (estadoGuardado.search) {
        api.search(estadoGuardado.search);
    }

    // Aplicar los filtros
    api.draw(false);

    // Restaurar scroll
    setTimeout(() => {
        window.scrollTo(0, estadoGuardado.scrollY || 0);
    }, 100);

    // 🔥 Eliminar el estado ya restaurado
    localStorage.removeItem(nombreEstado);
}
