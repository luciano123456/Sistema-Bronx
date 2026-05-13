function setLoginUiLoading(loading) {
    var $btn = $("#btnLoginSubmit");
    if (!$btn.length) return;

    if (loading) {
        $btn.attr("aria-busy", "true").prop("disabled", true);
        $btn.find(".login-btn-default").addClass("d-none").removeClass("d-inline-flex");
        $btn.find(".login-btn-loading").removeClass("d-none").addClass("d-inline-flex");
        $("#username, #password, #rememberMe").prop("disabled", true);
    } else {
        $btn.attr("aria-busy", "false").prop("disabled", false);
        $btn.find(".login-btn-default").removeClass("d-none").addClass("d-inline-flex");
        $btn.find(".login-btn-loading").addClass("d-none").removeClass("d-inline-flex");
        $("#username, #password, #rememberMe").prop("disabled", false);
    }
}

$(document).ready(function () {
    // Verificar si el usuario tiene credenciales guardadas
    if (localStorage.getItem('rememberMe') === 'true') {
        // Si el checkbox estaba seleccionado la última vez
        $("#username").val(localStorage.getItem('username'));
        $("#password").val(localStorage.getItem('password'));
        $("#rememberMe").prop('checked', true);
        $("#checkIcon").show(); // Mostrar el ícono verde de check
    }

    // Al enviar el formulario
    $("#loginForm").on("submit", function (event) {
        event.preventDefault(); // Evitar el envío tradicional del formulario

        setLoginUiLoading(true);

        var username = $("#username").val(); // Obtener el nombre de usuario
        var password = $("#password").val(); // Obtener la contraseña
        var token = $('input[name="__RequestVerificationToken"]').val(); // Obtener token CSRF
        var rememberMe = $("#rememberMe").prop('checked'); // Obtener el estado del checkbox

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
                    // Si "Recordar credenciales" está seleccionado, guarda las credenciales
                    if (rememberMe) {
                        localStorage.setItem('username', username);
                        localStorage.setItem('password', password);
                        localStorage.setItem('rememberMe', true);
                        $("#checkIcon").show(); // Mostrar el ícono verde de check
                    } else {
                        // Si no está seleccionado, eliminar las credenciales guardadas
                        localStorage.removeItem('username');
                        localStorage.removeItem('password');
                        localStorage.removeItem('rememberMe');
                        $("#checkIcon").hide(); // Ocultar el ícono de check
                    }

                    // Redirigir a la página principal
                    localStorage.setItem('userSession', JSON.stringify(data.user)); // Guardar el usuario
                    window.location.href = data.redirectUrl;
                } else {
                    setLoginUiLoading(false);
                    $("#errorMessage").text(data.message);
                    $("#diverrorMessage").show();
                    setTimeout(function () {
                        $("#diverrorMessage").fadeOut();
                    }, 3000);
                }
            })
            .catch(error => {
                console.error("Error: " + error);
                setLoginUiLoading(false);
                $("#errorMessage").text("Hubo un problema al procesar la solicitud. Volvé a intentarlo.");
                $("#diverrorMessage").show();
            });
    });

    // Al cambiar el estado del checkbox, mostrar u ocultar el ícono
    $("#rememberMe").on("change", function () {
        var username = $("#username").val(); // Obtener el nombre de usuario
        var password = $("#password").val(); // Obtener la contraseña
        if ($(this).prop('checked')) {
            $("#checkIcon").show(); // Mostrar el ícono verde de check
            localStorage.setItem('username', username);
            localStorage.setItem('password', password);
            localStorage.setItem('rememberMe', true);
        } else {
            $("#checkIcon").hide(); // Ocultar el ícono de check
            localStorage.removeItem('username');
            localStorage.removeItem('password');
            localStorage.removeItem('rememberMe');
        }
    });
});
