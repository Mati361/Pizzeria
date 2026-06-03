// CONFIGURACIÓN DE TU CLIENTE (Código de país + área + número sin el + ni espacios)
const TELEFONO_PIZZERIA = "5491134984283"; 

const pizzas = [
    { id: 1, nombre: "Muzarella", precio: 13000, imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500" },
    { id: 2, nombre: "Especial (Jamón y morrones)", precio: 15500, imagen: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=500" },
    { id: 3, nombre: "Fugazzeta", precio: 14000, imagen: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500" }
];

let carrito = [];
let metodoPagoSeleccionado = "Efectivo";

// Cargar catálogo al inicio
document.addEventListener("DOMContentLoaded", () => {
    const contenedor = document.getElementById("contenedor-productos");
    pizzas.forEach(pizza => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("tarjeta-producto");
        tarjeta.innerHTML = `
            <img src="${pizza.imagen}" alt="${pizza.nombre}">
            <div class="info-producto">
                <h3>${pizza.nombre}</h3>
                <p class="precio">$${pizza.precio.toLocaleString('es-AR')}</p>
                <button class="btn-agregar" onclick="agregarAlCarrito(${pizza.id})">
                    <i class="fa-solid fa-plus"></i> Agregar al carrito
                </button>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });
});

// Lógica de agregado al carrito
function agregarAlCarrito(id) {
    const pizzaSeleccionada = pizzas.find(p => p.id === id);
    const itemEnCarrito = carrito.find(item => item.id === id);

    if (itemEnCarrito) {
        itemEnCarrito.cantidad++;
    } else {
        carrito.push({ ...pizzaSeleccionada, cantidad: 1 });
    }

    actualizarContadorInterfaz();
    
    // Alerta rápida SweetAlert de éxito abajo a la derecha
    Swal.fire({
        text: `¡${pizzaSeleccionada.nombre} agregada!`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500
    });
}

function actualizarContadorInterfaz() {
    const totalCantidades = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    document.getElementById("contador-carrito").innerText = totalCantidades;
}

// Control del Modal
function abrirModalCarrito() {
    if (carrito.length === 0) {
        Swal.fire({ title: "Carrito vacío", text: "Sumá alguna pizza antes de ver tu pedido.", icon: "info", confirmButtonColor: "#e74c3c" });
        return;
    }
    document.getElementById("modal-carrito").style.display = "flex";
    dibujarContenidoCarrito();
}

function cerrarModalCarrito() {
    document.getElementById("modal-carrito").style.display = "none";
}

// Renderizar la lista de compras dentro del modal
function dibujarContenidoCarrito() {
    const listaHtml = document.getElementById("lista-carrito");
    listaHtml.innerHTML = "";
    
    let total = 0;

    carrito.forEach(item => {
        total += item.precio * item.cantidad;
        const div = document.createElement("div");
        div.classList.add("item-carrito");
        div.innerHTML = `
            <div>
                <strong>${item.nombre}</strong> <br> 
                <small>$${item.precio.toLocaleString('es-AR')} x ${item.cantidad}</small>
            </div>
            <span>$${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
        `;
        listaHtml.appendChild(div);
    });

    document.getElementById("total-precio").innerText = `$${total.toLocaleString('es-AR')}`;
    generarSugerenciasPago(total);
    calcularVuelto();
}

// Botones e Intercambio de Efectivo / Transferencia
function seleccionarMetodo(metodo) {
    metodoPagoSeleccionado = metodo;
    const btnEfectivo = document.getElementById("btn-efectivo");
    const btnTransf = document.getElementById("btn-transferencia");
    const seccionEfectivo = document.getElementById("seccion-efectivo");

    if (metodo === "Efectivo") {
        btnEfectivo.classList.add("activo");
        btnTransf.classList.remove("activo");
        seccionEfectivo.style.display = "block";
    } else {
        btnTransf.classList.add("activo");
        btnEfectivo.classList.remove("activo");
        seccionEfectivo.style.display = "none";
    }
}

// Autocompletado inteligente de billetes sugeridos
function generarSugerenciasPago(total) {
    const sugerenciasDiv = document.getElementById("sugerencias-pago");
    sugerenciasDiv.innerHTML = "";
    
    // Generamos tres cortes lógicos superiores al total
    const opciones = [
        Math.ceil(total / 1000) * 1000, 
        Math.ceil(total / 5000) * 5000,
        Math.ceil((total + 5000) / 10000) * 10000
    ];
    
    // Eliminamos duplicados por si acaso
    const opcionesUnicas = [...new Set(opciones)];

    opcionesUnicas.forEach(monto => {
        if(monto >= total) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.classList.add("btn-sug");
            btn.innerText = `$${monto.toLocaleString('es-AR')}`;
            btn.onclick = () => {
                document.getElementById("form-abona").value = monto;
                calcularVuelto();
            };
            sugerenciasDiv.appendChild(btn);
        }
    });
}

function calcularVuelto() {
    const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const abonaCon = parseFloat(document.getElementById("form-abona").value) || 0;
    const inputVuelto = document.getElementById("form-vuelto");

    if (abonaCon >= total) {
        inputVuelto.value = `$${(abonaCon - total).toLocaleString('es-AR')}`;
        inputVuelto.style.color = "#27ae60";
    } else {
        inputVuelto.value = "Monto insuficiente";
        inputVuelto.style.color = "#e74c3c";
    }
}

// Vaciar Carrito con SweetAlert de doble confirmación
function confirmarVaciarCarrito() {
    Swal.fire({
        title: '¿Seguro querés vaciar el carrito?',
        text: "Vas a perder los productos que ya seleccionaste",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#7f8c8d',
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'No, cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            carrito = [];
            actualizarContadorInterfaz();
            cerrarModalCarrito();
            Swal.fire('¡Vaciado!', 'Tu carrito vuelve a estar en cero.', 'success');
        }
    });
}

// Procesar el Submit y enviar WhatsApp
function procesarCompra(event) {
    event.preventDefault();

    const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const nombre = document.getElementById("form-nombre").value;
    const telefono = document.getElementById("form-telefono").value;
    const direccion = document.getElementById("form-direccion").value;
    const altura = document.getElementById("form-altura").value;
    const abonaCon = parseFloat(document.getElementById("form-abona").value) || 0;

    if (metodoPagoSeleccionado === "Efectivo" && abonaCon < total) {
        Swal.fire("Error en el pago", "El monto con el que abonás no alcanza a cubrir el total.", "error");
        return;
    }

    // Estructurar Ticket
    let pedidoTexto = "";
    carrito.forEach(item => {
        pedidoTexto += `🍕 *${item.cantidad}x* ${item.nombre} ($${(item.precio * item.cantidad).toLocaleString('es-AR')})\n`;
    });

    let detallesPago = `*Forma de pago:* ${metodoPagoSeleccionado}\n`;
    if (metodoPagoSeleccionado === "Efectivo") {
        const vuelto = abonaCon - total;
        detallesPago += `👉 Paga con: $${abonaCon.toLocaleString('es-AR')}\n`;
        detallesPago += `👉 Cambio requerido: $${vuelto.toLocaleString('es-AR')}\n`;
    }

    let mensajeCompleto = `=========================\n`;
    mensajeCompleto += `🍕 *NUEVO PEDIDO - PIZZERÍA* 🍕\n`;
    mensajeCompleto += `=========================\n\n`;
    mensajeCompleto += `*Datos del Cliente:*\n`;
    mensajeCompleto += `👤 Nombre: ${nombre}\n`;
    mensajeCompleto += `📞 Teléfono: ${telefono}\n`;
    mensajeCompleto += `📍 Envío a: ${direccion} ${altura}\n\n`;
    mensajeCompleto += `*Detalle de compra:*\n`;
    mensajeCompleto += pedidoTexto;
    mensajeCompleto += `\n💰 *Total a pagar: $${total.toLocaleString('es-AR')}*\n`;
    mensajeCompleto += detallesPago;
    mensajeCompleto += `\n=========================\n`;

    const urlFinal = `https://wa.me/${TELEFONO_PIZZERIA}?text=${encodeURIComponent(mensajeCompleto)}`;

    // Alerta final de agradecimiento
    Swal.fire({
        title: '¡Gracias por tu compra!',
        text: 'Te estamos redirigiendo a WhatsApp para enviar el ticket automático.',
        icon: 'success',
        confirmButtonColor: '#25d366',
        confirmButtonText: 'Enviar ticket'
    }).then(() => {
        // Al darle aceptar en el modal, vaciamos localmente y redirigimos
        carrito = [];
        actualizarContadorInterfaz();
        window.location.href = urlFinal; // Se va a WhatsApp y saca al usuario de la web
    });
}