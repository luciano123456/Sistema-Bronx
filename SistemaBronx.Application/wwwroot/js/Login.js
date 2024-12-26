$(document).ready(function () {
    // Al enviar el formulario
    $("#loginForm").on("submit", function (event) {
        event.preventDefault(); // Evitar el envío tradicional del formulario

        var username = $("#username").val(); // Obtener el nombre de usuario
        var password = $("#password").val(); // Obtener la contraseña
        var token = $('input[name="__RequestVerificationToken"]').val(); // Obtener token CSRF

        // Crear el objeto de datos para enviar
        var data = {
            Usuario: username,
            Contrasena: password,
            __RequestVerificationToken: token // Enviar el token CSRF
        };

        fetch(loginUrl, { // Aquí usamos la variable generada por Razor
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token // Enviar el token CSRF
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                console.log(response); // Verificar la respuesta
                if (!response.ok) {
                    throw new Error("Error en la respuesta del servidor");
                }
                return response.json(); // Parsear la respuesta JSON
            })
            .then(data => {
                console.log(data); // Verificar los datos recibidos
                if (data.success) {
                    // Redirigir a la página principal
                    localStorage.setItem('userSession', JSON.stringify(data.user)); // Guardar el usuario
                    window.location.href = data.redirectUrl;
                } else {
                    // Mostrar el mensaje de error
                    $(document).ready(function () {
                        // Mostrar el mensaje de error
                        $("#errorMessage").text(data.message).show(); // Establecer el mensaje
                        $("#diverrorMessage").show(); // Mostrar el div

                        // Ocultar el div después de 3 segundos
                        setTimeout(function () {
                            $("#diverrorMessage").fadeOut();
                        }, 3000); // 3000 milisegundos = 3 segundos
                    });


                }
            })
            .catch(error => {
                console.error("Error: " + error);
                $("#errorMessage").text("Hubo un problema al procesar la solicitud. Error: " + error).show();
            });
    });
});
