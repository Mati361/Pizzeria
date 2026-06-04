// CONFIGURACIÓN DE TU CLIENTE 
const TELEFONO_PIZZERIA = "5491134984283"; 
// Colocá acá tu link de cobro (Mercado Pago, etc.) para las tarjetas
const LINK_PAGO_TARJETA = "https://link.mercadopago.com.ar/tu_pizzería_ejemplo"; 

// 💻 CONFIGURACIÓN DE FIREBASE (Reemplazar por tus datos de consola)
 const firebaseConfig = {
    apiKey: "AIzaSyAqrjJCG888EJzRXd4mH7qeuzoq_1KTeFA",
    authDomain: "pizzeria-cb86c.firebaseapp.com",
    databaseURL: "https://pizzeria-cb86c-default-rtdb.firebaseio.com",
    projectId: "pizzeria-cb86c",
    storageBucket: "pizzeria-cb86c.firebasestorage.app",
    messagingSenderId: "959330862628",
    appId: "1:959330862628:web:7f37b32433d61abf5d3ab1",
    measurementId: "G-7XWF77CB28"
  };

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let pizzas = [];
let carrito = [];
let metodoPagoSeleccionado = "Efectivo";
let modoAdmin = false;

// Cargar catálogo desde Firebase en tiempo real
document.addEventListener("DOMContentLoaded", () => {
    verificarModoAdmin();
    
    db.ref('pizzas_menu').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            pizzas = Object.keys(data).map(key => ({
                id: key, 
                nombre: data[key].nombre,
                precio: data[key].precio,
                imagen: data[key].imagen
            }));
        } else {
            // Menú inicial por defecto si la base de datos está vacía
            const menuInicial = {
                "p1": { nombre: "Muzarella", precio: 13000, imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500" },
                "p2": { nombre: "Especial (Jamón y morrones)", precio: 15500, imagen: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=500" },
                "p3": { nombre: "Fugazzeta", precio: 14000, imagen: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500" }
            };
            db.ref('pizzas_menu').set(menuInicial);
            return;
        }
        dibujarProductos();
    });
});

function dibujarProductos() {
    const contenedor = document.getElementById("contenedor-productos");
    contenedor.innerHTML = ""; 

    pizzas.forEach(pizza => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("tarjeta-producto");
        
        const controlesAdmin = modoAdmin ? `
            <div class="controles-admin">
                <button type="button" class="btn-admin-edit" onclick="editarProducto('${pizza.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="btn-admin-delete" onclick="eliminarProducto('${pizza.id}')" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </div>
        ` : '';

        tarjeta.innerHTML = `
            <div style="position: relative;">
                <img src="${pizza.imagen}" alt="${pizza.nombre}">
                ${controlesAdmin}
            </div>
            <div class="info-producto">
                <h3>${pizza.nombre}</h3>
                <p class="precio">$${pizza.precio.toLocaleString('es-AR')}</p>
                <button type="button" class="btn-agregar" onclick="agregarAlCarrito('${pizza.id}')">
                    <i class="fa-solid fa-plus"></i> Agregar al carrito
                </button>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });
}

function agregarAlCarrito(id) {
    const pizzaSeleccionada = pizzas.find(p => p.id === id);
    const itemEnCarrito = carrito.find(item => item.id === id);

    if (itemEnCarrito) {
        itemEnCarrito.cantidad++;
    } else {
        carrito.push({ ...pizzaSeleccionada, cantidad: 1 });
    }

    actualizarContadorInterfaz();
    
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

// Intercambio Visual de Métodos de Pago (Efectivo / Transferencia / Tarjeta)
function seleccionarMetodo(metodo) {
    metodoPagoSeleccionado = metodo;
    const btnEfectivo = document.getElementById("btn-efectivo");
    const btnTransf = document.getElementById("btn-transferencia");
    const btnTarjeta = document.getElementById("btn-tarjeta");
    const seccionEfectivo = document.getElementById("seccion-efectivo");

    // Resetear clases activas
    btnEfectivo.classList.remove("activo");
    btnTransf.classList.remove("activo");
    btnTarjeta.classList.remove("activo");

    if (metodo === "Efectivo") {
        btnEfectivo.classList.add("activo");
        seccionEfectivo.style.display = "block";
    } else if (metodo === "Transferencia") {
        btnTransf.classList.add("activo");
        seccionEfectivo.style.display = "none";
    } else if (metodo === "Tarjeta") {
        btnTarjeta.classList.add("activo");
        seccionEfectivo.style.display = "none";
    }
}

function generarSugerenciasPago(total) {
    const sugerenciasDiv = document.getElementById("sugerencias-pago");
    sugerenciasDiv.innerHTML = "";
    
    const opciones = [
        Math.ceil(total / 1000) * 1000, 
        Math.ceil(total / 5000) * 5000,
        Math.ceil((total + 5000) / 10000) * 10000
    ];
    
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

// Procesar el Submit y redirecciones inteligentes según el pago
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

    let pedidoTexto = "";
    carrito.forEach(item => {
        pedidoTexto += `🍕 *${item.cantidad}x* ${item.nombre} ($${(item.precio * item.cantidad).toLocaleString('es-AR')})\n`;
    });

    let detallesPago = `*Forma de pago:* ${metodoPagoSeleccionado}\n`;
    if (metodoPagoSeleccionado === "Efectivo") {
        const vuelto = abonaCon - total;
        detallesPago += `👉 Paga con: $${abonaCon.toLocaleString('es-AR')}\n`;
        detallesPago += `👉 Cambio requerido: $${vuelto.toLocaleString('es-AR')}\n`;
    } else if (metodoPagoSeleccionado === "Transferencia") {
        detallesPago += `⚠️ *Nota:* Enviaré el comprobante de transferencia adjunto a este mensaje.\n`;
    } else if (metodoPagoSeleccionado === "Tarjeta") {
        detallesPago += `💳 *Estado:* Pago procesado online mediante tarjeta.\n`;
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

    const urlWhatsapp = `https://wa.me/${TELEFONO_PIZZERIA}?text=${encodeURIComponent(mensajeCompleto)}`;

    // Flujo dinámico según método de pago con SweetAlert
    if (metodoPagoSeleccionado === "Tarjeta") {
        Swal.fire({
            title: 'Procediendo al pago',
            text: 'Te abriremos la pasarela segura para cargar tu tarjeta. Luego de abonar, recordá enviar el ticket por WhatsApp.',
            icon: 'info',
            confirmButtonColor: '#3498db',
            confirmButtonText: 'Ir a pagar tarjeta'
        }).then(() => {
            // Guardamos el link de WhatsApp, limpiamos interfaz y abrimos primero pasarela
            carrito = [];
            actualizarContadorInterfaz();
            window.open(LINK_PAGO_TARJETA, '_blank'); // Abre pasarela en pestaña nueva
            window.location.href = urlWhatsapp;      // Redirige la web principal al chat de WhatsApp
        });
    } else if (metodoPagoSeleccionado === "Transferencia") {
        Swal.fire({
            title: '¡Pedido Reservado!',
            text: 'Te redirigimos a WhatsApp para enviarte el alias/CBU y que puedas mandarnos el comprobante de transferencia.',
            icon: 'success',
            confirmButtonColor: '#25d366',
            confirmButtonText: 'Enviar Ticket y Comprobante'
        }).then(() => {
            carrito = [];
            actualizarContadorInterfaz();
            window.location.href = urlWhatsapp;
        });
    } else {
        // Efectivo estándar
        Swal.fire({
            title: '¡Gracias por tu compra!',
            text: 'Te estamos redirigiendo a WhatsApp para enviar el ticket automático al local.',
            icon: 'success',
            confirmButtonColor: '#25d366',
            confirmButtonText: 'Enviar ticket'
        }).then(() => {
            carrito = [];
            actualizarContadorInterfaz();
            window.location.href = urlWhatsapp;
        });
    }
}

/* ==========================================================================
   🔒 PANEL INTEGRADO DE ADMINISTRADOR (CONEXIÓN FIREBASE EN NUBE)
   ========================================================================== */
function verificarModoAdmin() {
    const parametrosUrl = new URLSearchParams(window.location.search);
    if (parametrosUrl.get('admin') === 'napoles') {
        modoAdmin = true;
        inyectarBarraYBotonesAdmin();
    }
}

function inyectarBarraYBotonesAdmin() {
    const barra = document.createElement("div");
    barra.className = "barra-admin-alerta";
    barra.innerHTML = `<i class="fa-solid fa-cloud"></i> Modo Admin Online — Los cambios impactan a todos los clientes en tiempo real.`;
    document.body.insertBefore(barra, document.body.firstChild);

    const btnAgregarNuevo = document.createElement("div");
    btnAgregarNuevo.className = "btn-admin-flotante";
    btnAgregarNuevo.innerHTML = `<i class="fa-solid fa-plus"></i>`;
    btnAgregarNuevo.title = "Agregar Nueva Pizza a la Nube";
    btnAgregarNuevo.onclick = agregarNuevoProductoForm;
    document.body.appendChild(btnAgregarNuevo);
}

async function agregarNuevoProductoForm() {
    const { value: formValues } = await Swal.fire({
        title: 'Agregar Nueva Pizza (Online)',
        html:
            '<input id="swal-nombre" class="swal2-input" placeholder="Nombre de la pizza">' +
            '<input id="swal-precio" type="number" class="swal2-input" placeholder="Precio ($)">' +
            '<input id="swal-imagen" class="swal2-input" placeholder="URL de la imagen (Link)">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar en la Nube',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const nombre = document.getElementById('swal-nombre').value.trim();
            const precio = parseFloat(document.getElementById('swal-precio').value);
            let imagen = document.getElementById('swal-imagen').value.trim();

            if (!nombre || isNaN(precio) || precio <= 0) {
                Swal.showValidationMessage('Por favor completa Nombre y Precio válido');
                return false;
            }
            if (!imagen) {
                imagen = "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500";
            }
            return { nombre, precio, imagen };
        }
    });

    if (formValues) {
        db.ref('pizzas_menu').push(formValues);
        Swal.fire('¡Subido!', 'El menú global fue actualizado.', 'success');
    }
}

async function editarProducto(id) {
    const prod = pizzas.find(p => p.id === id);
    if (!prod) return;

    const { value: formValues } = await Swal.fire({
        title: 'Editar Producto Online',
        html:
            `<input id="swal-edit-nombre" class="swal2-input" placeholder="Nombre" value="${prod.nombre}">` +
            `<input id="swal-edit-precio" type="number" class="swal2-input" placeholder="Precio ($)" value="${prod.precio}">` +
            `<input id="swal-edit-imagen" class="swal2-input" placeholder="URL Imagen" value="${prod.imagen}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Actualizar Global',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const nombre = document.getElementById('swal-edit-nombre').value.trim();
            const precio = parseFloat(document.getElementById('swal-edit-precio').value);
            const imagen = document.getElementById('swal-edit-imagen').value.trim();

            if (!nombre || isNaN(precio) || precio <= 0) {
                Swal.showValidationMessage('Nombre y precio requeridos');
                return false;
            }
            return { nombre, precio, imagen };
        }
    });

    if (formValues) {
        db.ref('pizzas_menu/' + id).update(formValues);
        Swal.fire('¡Modificado!', 'Cambio guardado en la base de datos.', 'success');
    }
}

function eliminarProducto(id) {
    const prod = pizzas.find(p => p.id === id);
    if (!prod) return;

    Swal.fire({
        title: `¿Eliminar ${prod.nombre} de la nube?`,
        text: "Esto quitará el producto para absolutamente todos los clientes.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Sí, borrar de todos lados',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            db.ref('pizzas_menu/' + id).remove();
            Swal.fire('Eliminado', 'El producto desapareció del menú global.', 'success');
        }
    });
}