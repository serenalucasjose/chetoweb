require('../js/main.js');
require('../scss/style.scss');
// Utils
window.closeDialog = function closeDialog() {
    // Close the dialog
    document.getElementById('cheto-dialog').close();
    // Create a new URL without query parameters
    const url = new URL(window.location.href);
    const baseUrl = url.origin + url.pathname;
    // Update the URL without reloading the page
    history.pushState({}, '', baseUrl);
}
// MP
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const pagoExitoso = urlParams.get('pagoexitoso');
    const pagoEnProceso = urlParams.get('pagoenproceso');
    // Set msg
    let msg = '';
    if (pagoExitoso) {
        msg = `
            <p>Tu pago fue exitoso</p>
            <p>En breve recibirás un mail con la confirmación a la dirección de correo asociada a tu cuenta MercadoPago.</p>
            <p>Ante cualquier duda, también puedes enviar el comprobante de pago a nuestra cuenta de Instagram <a href="https://www.instagram.com/chetomusica?igsh=NTU1bXM5MDQ1MjIy" rel="noopener" target="_blank">@chetomusica</a></p>
            <p>Nos vemos pronto!</p>
            `;
    }
    if (pagoEnProceso) {
        msg = `
            <p>Tu pago esta en proceso</p>
            <p>En breve recibirás un mail con la confirmación a la dirección de correo asociada a tu cuenta MercadoPago.</p>
            <p>Ante cualquier duda, también puedes enviar el comprobante de pago a nuestra cuenta de Instagram <a href="https://www.instagram.com/chetomusica?igsh=NTU1bXM5MDQ1MjIy" rel="noopener" target="_blank">@chetomusica</a></p>
            <p>Nos vemos pronto!</p>
        `;
    }
    // Set the message to the dialog
    document.getElementById('dialog-msg').innerHTML = msg;
    // Display dialog
    document.getElementById('cheto-dialog').showModal();
});