let gridProductos;
var selectedProductos = [];
let idProveedorFiltro = -1, idClienteFiltro = -1;

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaMarcasFilter }, // Columna con un filtro de selección (de provincias)
    { index: 3, filterType: 'select', fetchDataFunc: listaCategoriasFilter }, // Columna con un filtro de selección (de provincias)
    { index: 4, filterType: 'select', fetchDataFunc: listaUnidadesDeMedidaFilter }, // Columna con un filtro de selección (de provincias)
    { index: 5, filterType: 'select', fetchDataFunc: listaMonedasFilter }, // Columna con un filtro de selección (de provincias)
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'text' },
    { index: 9, filterType: 'text' },
    { index: 10, filterType: 'text' },
];

const Modelo_base = {
    Id: 0,
    Descripcion: "",
    PCosto: "0",
    PVenta: "0",
    PorcGanancia: "0",
}

$(document).ready(() => {



    listaProductos();
    listaProveedoresFiltro();
    listaClientesFiltro();



    $('#txtDescripcion, #txtPorcentajeGanancia').on('input', function () {
        validarCampos()
    });
    $('#txtAumentoPrecioCosto').on('input', function () {
        validarCamposAumentarPrecioCosto()
    });

    $('#txtAumentoPrecioVenta').on('input', function () {
        validarCamposAumentarPrecioVenta()
    });

    $('#txtBajaPrecioCosto').on('input', function () {
        validarCamposBajarPrecioCosto()
    });

    $('#txtBajaPrecioVenta').on('input', function () {
        validarCamposBajarPrecioVenta()
    });


    $('#txtPrecioCosto').on('input', function () {
        validarCampos()
        sumarPorcentaje()

    });
    $('#txtPorcentajeGanancia').on('input', function () {
        sumarPorcentaje()
    });

    $('#txtPrecioVenta').on('input', function () {
        calcularPorcentaje()
    });

    $('#Proveedoresfiltro, #clientesfiltro').on('change', function () {
        validarProductosFiltro()
    });


})

function validarProductosFiltro() {
    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;

    if (idCliente == -1 && idProveedor == -1) {
        document.getElementById("txtProductoFiltro").removeAttribute("readonly");
    } else {
        document.getElementById("txtProductoFiltro").setAttribute("readonly", true);
        document.getElementById("txtProductoFiltro").value = "";
    }
}

// Define la función handleCheckboxClick
function handleCheckboxClick() {
    var icon = $(this).find('.fa');
    icon.toggleClass('checked');

    var checkboxIndex = $('.custom-checkbox').index($(this));
    var ventaId = $(this).data('id');

    if (icon.hasClass('checked')) {
        icon.removeClass('fa-square-o');
        icon.addClass('fa-check-square');
        selectedProductos.push(ventaId);
    } else {
        icon.removeClass('fa-check-square');
        icon.addClass('fa-square-o');
        var indexToRemove = selectedProductos.indexOf(ventaId);
        if (indexToRemove !== -1) {
            selectedProductos.splice(indexToRemove, 1);
        }
    }


    if (selectedProductos.length > 0 && idProveedorFiltro <= 0 && idClienteFiltro <= 0) {
        document.getElementById("btnAsignarProveedor").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarProveedor").setAttribute("hidden", "hidden");
    }

    if (selectedProductos.length > 0 && idProveedorFiltro > 0 && idClienteFiltro <= 0) {
        document.getElementById("btnAsignarCliente").removeAttribute("hidden");
    } else {
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
    }

    if (selectedProductos.length > 0) {
        document.getElementById("btnAumentarPrecios").removeAttribute("hidden");
        document.getElementById("btnBajarPrecios").removeAttribute("hidden");
    } else {
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");
    }


    console.log(selectedProductos);
}


function desmarcarCheckboxes() {
    // Obtener todos los elementos con la clase 'custom-checkbox' dentro de la tabla
    var checkboxes = gridProductos.cells('.custom-checkbox').nodes(); // Utiliza 'cells' para obtener las celdas en lugar de 'column'

    // Iterar sobre cada checkbox y desmarcarlo
    for (var i = 0; i < checkboxes.length; i++) {
        var icon = $(checkboxes[i]).find('.fa');

        // Desmarcar el checkbox
        icon.removeClass('fa-check-square');
        icon.addClass('fa-square-o');

        // Asegurarse de que la clase 'checked' esté eliminada
        icon.removeClass('checked');
    }

    // Limpiar el array de IDs seleccionados
    selectedProductos = [];

    // Ocultar el botón
    document.getElementById("btnAsignarProveedor").removeAttribute("hidden");
}

function sumarPorcentaje() {
    let precioCosto = Number($("#txtPrecioCosto").val());
    let porcentajeGanancia = Number($("#txtPorcentajeGanancia").val());

    if (!isNaN(precioCosto) && !isNaN(porcentajeGanancia)) {
        let precioVenta = precioCosto + (precioCosto * (porcentajeGanancia / 100));
        // Limitar el precio de venta a 2 decimales
        precioVenta = precioVenta.toFixed(2);
        $("#txtPrecioVenta").val(precioVenta);
    }
}


function calcularPorcentaje() {
    let precioCosto = Number($("#txtPrecioCosto").val());
    let precioVenta = Number($("#txtPrecioVenta").val());

    if (!isNaN(precioCosto) && !isNaN(precioVenta) && precioCosto !== 0) {
        let porcentajeGanancia = ((precioVenta - precioCosto) / precioCosto) * 100;
        // Limitar el porcentaje de ganancia a 2 decimales
        porcentajeGanancia = porcentajeGanancia.toFixed(2);
        $("#txtPorcentajeGanancia").val(porcentajeGanancia);
    }
}

async function listaProveedoresFiltro() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Proveedoresfiltro option').remove();

    selectProveedores = document.getElementById("Proveedoresfiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "-";
    selectProveedores.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProveedores.appendChild(option);

    }
}

async function listaClientesFiltro() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#clientesfiltro option').remove();

    selectClientes = document.getElementById("clientesfiltro");

    option = document.createElement("option");
    option.value = -1;
    option.text = "-";
    selectClientes.appendChild(option);

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectClientes.appendChild(option);

    }
}

async function aplicarFiltros() {
    var validacionFiltros = validarFiltros();
    if (!validacionFiltros) {
        const idCliente = document.getElementById("clientesfiltro").value;
        const idProveedor = document.getElementById("Proveedoresfiltro").value;
        const producto = document.getElementById("txtProductoFiltro").value;

        idClienteFiltro = idCliente;
        idProveedorFiltro = idProveedor;

        document.getElementById("btnAsignarProveedor").setAttribute("hidden", "hidden");
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");

        if (idClienteFiltro > 0 || idProveedorFiltro > 0) {
            document.getElementById("btnNuevo").setAttribute("hidden", "hidden");
        } else {
            document.getElementById("btnNuevo").removeAttribute("hidden");
        }

        if (producto != "") {
            await actualizarVisibilidadProveedor(true);
            gridProductos.column(2).visible(true);
            gridProductos.column(10).visible(false);
            
        } else {
            gridProductos.column(2).visible(false);
            gridProductos.column(10).visible(true);
            await actualizarVisibilidadProveedor(false);
        }


        selectedProductos = [];

        const url = `Productos/ListaProductosFiltro?idCliente=${idCliente}&idProveedor=${idProveedor}&producto=${producto}`;

        fetch(url, {
            method: "GET",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            }
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                configurarDataTable(dataJson);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal(validacionFiltros)
    }
}

function asignarProveedor() {

    const nuevoModelo = {
        productos: JSON.stringify(selectedProductos),
        idProveedor: document.getElementById("Proveedores").value

    };

    const url = "Productos/AsignarProveedor";
    const method = "POST";

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(nuevoModelo)
    })
        .then(response => {
            if (!response.ok) throw new Error(response.statusText);
            return response.json();
        })
        .then(dataJson => {
            const mensaje = "Proveedor asignado correctamente";
            exitoModal(mensaje);
            $("#modalProveedores").modal("hide");
            //desmarcarCheckboxes();
            //listaProductos();

        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function aumentarPrecios() {

    if (validarCamposAumentarPrecioCosto && validarCamposAumentarPrecioVenta) {


        const nuevoModelo = {
            productos: JSON.stringify(selectedProductos),
            idProveedor: idProveedorFiltro,
            idCliente: idClienteFiltro,
            PorcentajeCosto: document.getElementById("txtAumentoPrecioCosto").value,
            PorcentajeVenta: document.getElementById("txtAumentoPrecioVenta").value

        };

        const url = "Productos/AumentarPrecios";
        const method = "POST";

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                const mensaje = "Precios aumentados correctamente";
                exitoModal(mensaje);
                $("#modalAumentar").modal("hide");
                listaProductos();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos')
    }
}

function bajarPrecios() {

    if (validarCamposBajarPrecioCosto && validarCamposBajarPrecioVenta) {
        const nuevoModelo = {
            productos: JSON.stringify(selectedProductos),
            idProveedor: idProveedorFiltro,
            idCliente: idClienteFiltro,
            PorcentajeCosto: document.getElementById("txtBajaPrecioCosto").value,
            PorcentajeVenta: document.getElementById("txtBajaPrecioVenta").value

        };

        const url = "Productos/BajarPrecios";
        const method = "POST";

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                const mensaje = "Precios bajados correctamente";
                exitoModal(mensaje);
                $("#modalBajar").modal("hide");
                listaProductos();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos')
    }
}


function asignarCliente() {

    const nuevoModelo = {
        productos: JSON.stringify(selectedProductos),
        idProveedor: idProveedorFiltro,
        idCliente: document.getElementById("Clientes").value

    };

    const url = "Productos/AsignarCliente";
    const method = "POST";

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(nuevoModelo)
    })
        .then(response => {
            if (!response.ok) throw new Error(response.statusText);
            return response.json();
        })
        .then(dataJson => {
            const mensaje = "Cliente asignado correctamente";
            exitoModal(mensaje);
            $("#modalClientes").modal("hide");

        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function guardarCambios() {
    if (validarCampos()) {
        sumarPorcentaje(); //Por si las dudas
        const idProducto = $("#txtId").val();
        const nuevoModelo = {
            IdCliente: idClienteFiltro,
            IdProveedor: idProveedorFiltro,
            "Id": idProducto !== "" ? idProducto : 0,
            "Descripcion": $("#txtDescripcion").val(),
            "IdMarca": $("#Marcas").val(),
            "IdCategoria": $("#Categorias").val(),
            "IdMoneda": $("#Monedas").val(),
            "IdUnidadDeMedida": $("#UnidadesDeMedidas").val(),
            "PCosto": parseDecimal($("#txtPrecioCosto").val()),
            "PVenta": parseDecimal($("#txtPrecioVenta").val()),
            "PorcGanancia": parseDecimal($("#txtPorcentajeGanancia").val()),
            "Image": document.getElementById("imgProd").value,
        };

        const url = idProducto === "" ? "Productos/Insertar" : "Productos/Actualizar";
        const method = idProducto === "" ? "POST" : "PUT";

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                const mensaje = idProducto === "" ? "Producto registrado correctamente" : "Producto modificado correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaProductos();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function validarCamposAumentarPrecioCosto() {
    const aumento = $("#txtAumentoPrecioCosto").val();

    const aumentoValido = aumento !== "";

    $("#lblAumentoPrecioCosto").css("color", aumentoValido ? "" : "red");
    $("#txtAumentoPrecioCosto").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}

function validarCamposAumentarPrecioVenta() {
    const aumento = $("#txtAumentoPrecioVenta").val();

    const aumentoValido = aumento !== "";

    $("#lblAumentoPrecioVenta").css("color", aumentoValido ? "" : "red");
    $("#txtAumentoPrecioVenta").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}


function validarCamposBajarPrecioCosto() {
    const aumento = $("#txtAumentoPrecioCosto").val();

    const aumentoValido = aumento !== "";

    $("#lblBajaPrecioCosto").css("color", aumentoValido ? "" : "red");
    $("#txtBajaPrecioCosto").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}

function validarCamposBajarPrecioVenta() {
    const aumento = $("#txtAumentoPrecioVenta").val();

    const aumentoValido = aumento !== "";

    $("#lblBajaPrecioVenta").css("color", aumentoValido ? "" : "red");
    $("#txtBajaPrecioVenta").css("border-color", aumentoValido ? "" : "red");

    return aumentoValido;
}

function validarCampos() {
    const descripcion = $("#txtDescripcion").val();
    const precioCosto = $("#txtPrecioCosto").val();
    const precioVenta = $("#txtPrecioVenta").val();
    const porcentajeGanancia = $("#txtPorcentajeGanancia").val();

    const descripcionValida = descripcion !== "";
    const precioCostoValido = precioCosto !== "" && !isNaN(precioCosto);
    const precioVentaValido = precioVenta !== "" && !isNaN(precioVenta);
    const porcentajeGananciaValido = porcentajeGanancia !== "" && !isNaN(porcentajeGanancia);

    $("#lblDescripcion").css("color", descripcionValida ? "" : "red");
    $("#txtDescripcion").css("border-color", descripcionValida ? "" : "red");

    $("#lblPrecioCosto").css("color", precioCostoValido ? "" : "red");
    $("#txtPrecioCosto").css("border-color", precioCostoValido ? "" : "red");

    $("#lblPorcentajeGanancia").css("color", porcentajeGananciaValido ? "" : "red");
    $("#txtPorcentajeGanancia").css("border-color", porcentajeGananciaValido ? "" : "red");

    return descripcionValida && precioCostoValido && precioVentaValido && porcentajeGananciaValido;
}

function validarFiltros() {
    let mensaje = "";

    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;
    if (idCliente > 0 && idProveedor <= 0) {
        mensaje = "No puedes filtrar por un cliente sin proveedor."
    }

    return mensaje
}

function nuevoProducto() {

    limpiarModal();
    listaMarcas();
    listaCategorias();
    listaMonedas();
    listaUnidadesDeMedida();
    document.getElementById("Marcas").removeAttribute("disabled");
    document.getElementById("txtDescripcion").removeAttribute("disabled");
    document.getElementById("Categorias").removeAttribute("disabled");
    document.getElementById("Monedas").removeAttribute("disabled");
    document.getElementById("Imagen").removeAttribute("disabled");
    document.getElementById("UnidadesDeMedidas").removeAttribute("disabled");
    document.getElementById("txtPrecioCosto").classList.remove("txtEdicion");
    document.getElementById("txtPorcentajeGanancia").classList.remove("txtEdicion");
    document.getElementById("txtPrecioVenta").classList.remove("txtEdicion");
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Producto");
    asignarCamposObligatorios()
}

function asignarCamposObligatorios() {
    $('#lblDescripcion').css('color', 'red');
    $('#txtDescripcion').css('border-color', 'red');
    $('#lblPrecioCosto').css('color', 'red');
    $('#txtPrecioCosto').css('border-color', 'red');
    $('#lblPorcentajeGanancia').css('color', 'red');
    $('#txtPorcentajeGanancia').css('border-color', 'red');
}

async function mostrarModal(modelo) {
    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;

    if (idProveedor > 0 || idCliente > 0) {
        document.getElementById("Marcas").setAttribute("disabled", "disabled");
        document.getElementById("txtDescripcion").setAttribute("disabled", "disabled");
        document.getElementById("Categorias").setAttribute("disabled", "disabled");
        document.getElementById("Monedas").setAttribute("disabled", "disabled");
        document.getElementById("UnidadesDeMedidas").setAttribute("disabled", "disabled");
        document.getElementById("txtPrecioCosto").classList.add("txtEdicion");
        document.getElementById("txtPorcentajeGanancia").classList.add("txtEdicion");
        document.getElementById("txtPrecioVenta").classList.add("txtEdicion");
        document.getElementById("Imagen").setAttribute("disabled", "disabled");
    } else {
        document.getElementById("Marcas").removeAttribute("disabled");
        document.getElementById("txtDescripcion").removeAttribute("disabled");
        document.getElementById("Categorias").removeAttribute("disabled");
        document.getElementById("Monedas").removeAttribute("disabled");
        document.getElementById("Imagen").removeAttribute("disabled");
        document.getElementById("UnidadesDeMedidas").removeAttribute("disabled");
        document.getElementById("txtPrecioCosto").classList.remove("txtEdicion");
        document.getElementById("txtPorcentajeGanancia").classList.remove("txtEdicion");
        document.getElementById("txtPrecioVenta").classList.remove("txtEdicion");

    }
    const campos = ["Id", "Descripcion", "PrecioCosto", "PrecioVenta", "PorcentajeGanancia"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });

    await listaMarcas();
    await listaCategorias();
    await listaMonedas();
    await listaUnidadesDeMedida();


    $("#imgProducto").attr("src", "data:image/png;base64," + modelo.Image);
    $("#imgProd").val(modelo.Image);
    document.getElementById("txtPrecioCosto").value = modelo.PCosto;
    document.getElementById("txtPrecioVenta").value = modelo.PVenta;
    document.getElementById("txtPorcentajeGanancia").value = modelo.PorcGanancia;
    document.getElementById("Marcas").value = modelo.IdMarca;
    document.getElementById("Categorias").value = modelo.IdCategoria;
    document.getElementById("Monedas").value = modelo.IdMoneda;
    document.getElementById("UnidadesDeMedidas").value = modelo.IdUnidadDeMedida;



    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Producto");

    validarCampos();
}




function limpiarModal() {
    const campos = ["Id", "Descripcion", "PrecioCosto", "PrecioVenta", "PorcentajeGanancia"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });

    $("#imgProducto").attr("src", "");
    $("#imgProd").val("");

}



async function listaProductos() {

    if (idClienteFiltro > 0 || idProveedorFiltro > 0) {
        aplicarFiltros();

    } else {

        document.getElementById("btnAsignarProveedor").setAttribute("hidden", "hidden");
        document.getElementById("btnAsignarCliente").setAttribute("hidden", "hidden");
        document.getElementById("btnAumentarPrecios").setAttribute("hidden", "hidden");
        document.getElementById("btnBajarPrecios").setAttribute("hidden", "hidden");


        selectedProductos = [];

        const url = `/Productos/Lista`;
        const response = await fetch(url);
        const data = await response.json();
        await configurarDataTable(data);
    }


}

async function listaMarcas() {
    const url = `/Marcas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Marcas option').remove();

    selectProvincias = document.getElementById("Marcas");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}



async function listaMarcasFilter() {
    const url = `/Marcas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(provincia => ({
        Id: provincia.Id,
        Nombre: provincia.Nombre
    }));

}


async function listaCategorias() {
    const url = `/Categorias/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Categorias option').remove();

    selectProvincias = document.getElementById("Categorias");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

async function listaCategoriasFilter() {
    const url = `/Categorias/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(categoria => ({
        Id: categoria.Id,
        Nombre: categoria.Nombre
    }));

}


async function listaMonedas() {
    const url = `/Monedas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Monedas option').remove();

    selectProvincias = document.getElementById("Monedas");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

async function listaMonedasFilter() {
    const url = `/Monedas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(moneda => ({
        Id: moneda.Id,
        Nombre: moneda.Nombre
    }));

}

async function listaUnidadesDeMedida() {
    const url = `/UnidadesDeMedidas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#UnidadesDeMedidas option').remove();

    selectProvincias = document.getElementById("UnidadesDeMedidas");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProvincias.appendChild(option);

    }
}

async function listaUnidadesDeMedidaFilter() {
    const url = `/UnidadesDeMedidas/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    return data.map(UnidadesDeMedida => ({
        Id: UnidadesDeMedida.Id,
        Nombre: UnidadesDeMedida.Nombre
    }));

}


const editarProducto = id => {
    const idCliente = document.getElementById("clientesfiltro").value;
    const idProveedor = document.getElementById("Proveedoresfiltro").value;
    const url = `Productos/EditarInfo?id=${id}&idCliente=${idCliente}&idProveedor=${idProveedor}`
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => {
            if (dataJson !== null) {
                mostrarModal(dataJson);
            } else {
                throw new Error("Ha ocurrido un error.");
            }
        })
        .catch(error => {
            errorModal("Ha ocurrido un error.");
        });
}
async function eliminarProducto(id) {
    let resultado = window.confirm("¿Desea eliminar el Producto?");

    if (resultado) {
        try {
            const response = await fetch(`Productos/Eliminar?id=${id}&idProveedor=${idProveedorFiltro}&idCliente=${idClienteFiltro}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar el Producto.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaProductos();
                exitoModal("Producto eliminado correctamente")
            }
        } catch (error) {
            errorModal("Ha ocurrido un error al eliminar el producto");
        }
    }
}

async function configurarDataTable(data) {
    if (!gridProductos) {
        $('#grd_Productos thead tr').clone(true).addClass('filters').appendTo('#grd_Productos thead');
        gridProductos = $('#grd_Productos').DataTable({
            data: data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {
                    "data": "Image", "render": function (data) {
                        if (!data) {
                            var img = "/Imagenes/sin-imagen.png";
                            return '<img src="' + img + '" width="40%" />';
                        }
                        else {
                            var img = 'data:image/png;base64,' + data;
                            return '<img src="' + img + '" width="60%" />';
                        }
                    }
                },

                { data: 'Descripcion' },
                { data: 'Proveedor', visible: false },
                { data: 'Marca' },
                { data: 'Categoria' },
                { data: 'UnidadDeMedida' },
                { data: 'Moneda' },
                { data: 'PCosto' },
                { data: 'PVenta' },
                { data: 'PorcGanancia' },

                {
                    data: "Id",
                    render: function (data) {

                        const isChecked = false;

                        const checkboxClass = isChecked ? 'fa-check-square-o' : 'fa-square-o';

                        return `
                                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='editarProducto(${data})' title='Editar'>
                                    <i class='fa fa-pencil-square-o fa-lg text-white' aria-hidden='true'></i>
                                </button>
                                <button class='btn btn-sm btneditar btnacciones' type='button' onclick='eliminarProducto(${data})' title='Eliminar'>
                                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i>
                                </button>
                                <span class="custom-checkbox" data-id='${data}'>
                                    <i class="fa ${checkboxClass} checkbox"></i>
                                </span>`;
                    },
                    orderable: true,
                    searchable: true,
                }

            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Productos',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7, 8]
                    },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Productos',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7, 8]
                    },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: {
                        columns: [1, 2, 3, 4, 5, 6, 7, 8]
                    },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            "columnDefs": [
                {
                    "render": function (data, type, row) {
                        return formatNumber(data); // Formatear número en la columna
                    },
                    "targets": [7, 8] // Columnas Venta, Cobro, Capital Final
                }
            ],



            initComplete: async function () {
                var api = this.api();

                // Iterar sobre las columnas y aplicar la configuración de filtros
                columnConfig.forEach(async (config) => {
                    var cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        var select = $('<select id="filter' + config.index + '"><option value="">Seleccionar</option></select>')
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                var val = $(this).val();
                                var selectedText = $(this).find('option:selected').text(); // Obtener el texto del nombre visible
                                await api.column(config.index).search(val ? '^' + selectedText + '$' : '', true, false).draw(); // Buscar el texto del nombre
                            });

                        var data = await config.fetchDataFunc(); // Llamada a la función para obtener los datos
                        data.forEach(function (item) {
                            select.append('<option value="' + item.Id + '">' + item.Nombre + '</option>')
                        });

                    } else if (config.filterType === 'text') {
                        var input = $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off('keyup change') // Desactivar manejadores anteriores
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                var regexr = '({search})';
                                var cursorPosition = this.selectionStart;
                                api.column(config.index)
                                    .search(this.value != '' ? regexr.replace('{search}', '(((' + this.value + ')))') : '', this.value != '', this.value == '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                });

                var lastColIdx = api.columns().indexes().length - 1;
                $('.filters th').eq(lastColIdx).html(''); // Limpiar la última columna si es necesario
                $('.filters th').eq(0).html('');
                setTimeout(function () {
                    gridProductos.columns.adjust();
                }, 10);





                $('body').on('click', '#grd_Productos .fa-map-marker', function () {
                    var locationText = $(this).parent().text().trim().replace(' ', ' '); // Obtener el texto visible
                    var url = 'https://www.google.com/maps?q=' + encodeURIComponent(locationText);
                    window.open(url, '_blank');
                });
            },
        });

        $('#grd_Productos').on('draw.dt', function () {
            $(document).off('click', '.custom-checkbox'); // Desvincular el evento para evitar duplicaciones
            $(document).on('click', '.custom-checkbox', handleCheckboxClick);
        });

        $(document).on('click', '.custom-checkbox', function (event) {
            handleCheckboxClick();
        });

        $('body').on('mouseenter', '#grd_Productos .fa-map-marker', function () {
            $(this).css('cursor', 'pointer');
        });
    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}



async function actualizarVisibilidadProveedor(visible) {
    var column = gridProductos.column(2); // Asumiendo que la columna "Proveedor" es la tercera columna (índice 2)
    column.visible(visible);

    if (visible) {
        var cell = $('.filters th').eq(2);
        var select = $('<select id="filter2"><option value="">Seleccionar</option></select>')
            .appendTo(cell.empty())
            .on('change', function () {
                var val = $(this).val();
                gridProductos.column(2).search(val ? '^' + val + '$' : '', true, false).draw();
            });

        try {
            var data = await listaProveedoresFilter(); // Obtener datos de proveedores
            data.forEach(function (item) {
                select.append('<option value="' + item.Nombre + '">' + item.Nombre + '</option>');
            });
        } catch (error) {
            console.error("Error al obtener datos de proveedores:", error);
            // Manejar el error según sea necesario
        }
    }
}


async function listaProveedoresFilter() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Mapear los datos a la estructura requerida
    const proveedores = data.map(proveedor => ({
        Id: proveedor.Id,
        Nombre: proveedor.Nombre
    }));

    return proveedores;
}

function agregarFiltroDesplegable(column, obtenerOpciones, opcionPredeterminada = "Seleccionar") {
    var select = $('<select><option value="">' + opcionPredeterminada + '</option></select>')
        .appendTo($(column.header()).empty())
        .on('change', function () {
            var val = $.fn.dataTable.util.escapeRegex(
                $(this).val()
            );

            column
                .search(val ? '^' + val + '$' : '', true, false)
                .draw();
        });

    obtenerOpciones(function (opciones) {
        opciones.forEach(function (opcion) {
            select.append('<option value="' + opcion.valor + '">' + opcion.texto + '</option>');
        });
    });
}

const fileInput = document.getElementById("Imagen");

fileInput.addEventListener("change", (e) => {
    var files = e.target.files
    let base64String = "";
    let baseTotal = "";

    // get a reference to the file
    const file = e.target.files[0];



    // encode the file using the FileReader API
    const reader = new FileReader();
    reader.onloadend = () => {
        // use a regex to remove data url part

        base64String = reader.result
            .replace("data:", "")
            .replace(/^.+,/, "");


        var inputImg = document.getElementById("imgProd");
        inputImg.value = base64String;

        $("#imgProducto").removeAttr('hidden');
        $("#imgProducto").attr("src", "data:image/png;base64," + base64String);

    };

    reader.readAsDataURL(file);

}
);

function abrirmodalProveedor() {
    listaProveedores();
    $("#modalProveedores").modal("show");
}
async function listaProveedores() {
    const url = `/Proveedores/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Proveedores option').remove();

    selectProveedores = document.getElementById("Proveedores");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectProveedores.appendChild(option);

    }
}

function abrirmodalAumentarPrecios() {
    $("#txtAumentoPrecioCosto").val("0");
    $("#txtAumentoPrecioVenta").val("0");
    $("#modalAumentar").modal("show");
    validarCamposAumentarPrecioCosto();
    validarCamposAumentarPrecioVenta();

}

function abrirmodalBajarPrecios() {
    $("#txtBajaPrecioCosto").val("0");
    $("#txtBajaPrecioVenta").val("0");
    $("#modalBajar").modal("show");
    validarCamposBajarPrecioCosto();
    validarCamposBajarPrecioVenta();
}

function abrirmodalCliente() {
    listaClientes();
    $("#modalClientes").modal("show");
}
async function listaClientes() {
    const url = `/Clientes/Lista`;
    const response = await fetch(url);
    const data = await response.json();

    $('#Clientes option').remove();

    selectClientes = document.getElementById("Clientes");

    for (i = 0; i < data.length; i++) {
        option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        selectClientes.appendChild(option);

    }
}
