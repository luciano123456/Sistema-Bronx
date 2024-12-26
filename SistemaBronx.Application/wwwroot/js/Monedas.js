let gridMonedas;

const columnConfig = [
    { index: 0, filterType: 'text' },
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },

];

const Modelo_base = {
    Id: 0,
    Nombre: "",
    Cotizacion: "",
    Image: "",
}

$(document).ready(() => {

    listaMonedas();

    $('#txtNombre').on('input', function () {
        validarCampos()
    });
})



function guardarCambios() {
    if (validarCampos()) {
        const idMoneda = $("#txtId").val();
        const nuevoModelo = {
            "Id": idMoneda !== "" ? idMoneda : 0,
            "Nombre": $("#txtNombre").val(),
            "Cotizacion": $("#txtCotizacion").val(),
            "Image": document.getElementById("imgMon").value,
           
        };

        const url = idMoneda === "" ? "Monedas/Insertar" : "Monedas/Actualizar";
        const method = idMoneda === "" ? "POST" : "PUT";

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
                const mensaje = idMoneda === "" ? "Moneda registrada correctamente" : "Moneda modificada correctamente";
                $('#modalEdicion').modal('hide');
                exitoModal(mensaje);
                listaMonedas();
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}


function validarCampos() {
    const nombre = $("#txtNombre").val();
    const camposValidos = nombre !== "";

    $("#lblNombre").css("color", camposValidos ? "" : "red");
    $("#txtNombre").css("border-color", camposValidos ? "" : "red");

    return camposValidos;
}
function nuevoMoneda() {
    limpiarModal();
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nueva Moneda");
    $('#lblNombre').css('color', 'red');
    $('#txtNombre').css('border-color', 'red');
}


async function mostrarModal(modelo) {
    const campos = ["Id", "Nombre", "Cotizacion", "Image"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val(modelo[campo]);
    });

    $("#imgMoneda").attr("src", "data:image/png;base64," + modelo.Image);
    $("#imgMon").val(modelo.Image);


    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Moneda");

    $('#lblNombre, #txtNombre').css('color', '').css('border-color', '');
}




function limpiarModal() {
    const campos = ["Id", "Nombre", "Cotizacion", "ImgMoneda"];
    campos.forEach(campo => {
        $(`#txt${campo}`).val("");
    });


    $("#lblNombre, #txtNombre").css("color", "").css("border-color", "");
}


async function listaMonedas() {
    const url = `/Monedas/Lista`; // URL de la API de monedas
    const response = await fetch(url);
    const data = await response.json(); // Obtén el array de monedas desde la API

    const container = document.getElementById("monedasContainer");
    container.innerHTML = ''; // Limpiar el contenedor

    // Crear las tarjetas para cada moneda
    data.forEach(moned => {
        // Crear la tarjeta de moneda
        const card = document.createElement("div");
        card.classList.add("card");

        // Crear la imagen de la moneda
        const img = document.createElement("img");
        img.src = "data:image/png;base64," + moned.Image; // Ruta de la imagen de la moneda
        img.alt = moned.Nombre; // Nombre o descripción de la moneda
        card.appendChild(img);

        // Crear el nombre de la moneda
        const nombre = document.createElement("p");
        nombre.textContent = moned.Nombre; // Nombre de la moneda
        nombre.classList.add("nombre")
        card.appendChild(nombre);

        // Crear la cotización de la moneda
        const precio = document.createElement("p");
        precio.textContent = formatNumber(moned.Cotizacion); // Cotización de la moneda
        precio.classList.add("cotizacion")
        card.appendChild(precio);

        // Crear el ícono de lápiz y añadir al card
        const eliminarIcon = document.createElement("i");
        eliminarIcon.classList.add("fa", "fa-trash-o", "eliminar-icon");
        eliminarIcon.classList.add("text-danger");
        eliminarIcon.onclick = function () {
            eliminarMoneda(moned.Id); // Llamar a la función de edición pasando el ID
        };
        card.appendChild(eliminarIcon);

        // Agregar la tarjeta al contenedor
        container.appendChild(card);

        // Crear el ícono de lápiz y añadir al card
        const editarIcon = document.createElement("i");
        editarIcon.classList.add("fa", "fa-pencil-square-o", "edit-icon");
        editarIcon.onclick = function () {
            editarMoneda(moned.Id); // Llamar a la función de edición pasando el ID
        };
        card.appendChild(editarIcon);

       
    });

    // Crear la tarjeta para agregar nueva moneda al final
    const addCard = document.createElement("div");
    addCard.classList.add("card", "add-card");
    const addIcon = document.createElement("img"); // Usar imagen para agregar
    addIcon.src = "imagenes/agregar.png"; // Ruta de la imagen para agregar
    addIcon.alt = "Agregar"; // Texto alternativo de la imagen
    addIcon.onclick = function () {
        nuevoMoneda(); // Llamar a la función para agregar nueva moneda
    };
    addCard.appendChild(addIcon);

    // Agregar la nueva tarjeta al final
    container.appendChild(addCard);
}


const editarMoneda = id => {
    fetch("Monedas/EditarInfo?id=" + id)
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
async function eliminarMoneda(id) {
    let resultado = window.confirm("¿Desea eliminar la Moneda?");

    if (resultado) {
        try {
            const response = await fetch("Monedas/Eliminar?id=" + id, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Error al eliminar la Moneda.");
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                listaMonedas();
                exitoModal("Moneda eliminada correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
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


        var inputImg = document.getElementById("imgMon");
        inputImg.value = base64String;

        $("#imgMoneda").removeAttr('hidden');
        $("#imgMoneda").attr("src", "data:image/png;base64," + base64String);

    };

    reader.readAsDataURL(file);

}
);
