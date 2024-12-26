let timerError; // Mover la variable fuera del evento para que sea accesible globalmente

document.querySelector('form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);

    const data = Object.fromEntries(formData.entries());

    const response = await fetch('/Usuarios/Actualizar', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    const msjError = $('#msjerror');
    const btnGuardar = $('#btnGuardar'); // Suponiendo que el botón "Guardar cambios" tiene el id "btnGuardar"
    const btnCancelar = $('#btnCancelar'); // Suponiendo que el botón "Cancelar" tiene el id "btnCancelar"
    msjError.attr("hidden", false); // Muestra el elemento de mensaje de error

    // Limpiar cualquier temporizador previo
    if (timerError) {
        clearTimeout(timerError);
    }

    if (result.valor == "Contrasena") {
        msjError.html('<i class="fa fa-exclamation-circle"></i> Contraseña incorrecta <i class="fa fa-exclamation-circle"></i>'); // Establece el mensaje de contraseña incorrecta
        msjError.css('color', 'red'); // Cambia el color del texto a rojo
        btnGuardar.show(); // Muestra el botón "Guardar cambios"

        // Temporizador de error
        timerError = setTimeout(() => {
            msjError.attr("hidden", true); // Oculta el mensaje después de 6 segundos
        }, 6000);

    } else if (result.valor == "OK") {
        msjError.html('<i class="fa fa-check-circle"></i> Datos guardados correctamente <i class="fa fa-check-circle"></i><br>En <span id="contador">5</span> segundos serás redirigido a la página principal.'); // Mensaje de éxito
        msjError.css('color', 'green'); // Cambia el color del texto a verde
        btnGuardar.hide(); // Oculta el botón "Guardar cambios"

        // Temporizador de redirección
        let seconds = 5;
        const interval = setInterval(() => {
            seconds--;
            $('#contador').text(seconds); // Actualiza el contador
            if (seconds === 0) {
                clearInterval(interval); // Detiene el contador
                window.location.href = '/'; // Redirige a la página principal
            }
        }, 1000);

    } else {
        msjError.html('<i class="fa fa-exclamation-circle"></i> Ha ocurrido un error al actualizar los datos. <i class="fa fa-exclamation-circle"></i>'); // Mensaje de error por defecto
        msjError.css('color', 'red'); // Cambia el color del texto a rojo
        btnGuardar.show(); // Muestra el botón "Guardar cambios"

        // Temporizador de error
        timerError = setTimeout(() => {
            msjError.attr("hidden", true); // Oculta el mensaje después de 6 segundos
        }, 6000);
    }

    console.log(result);
});
