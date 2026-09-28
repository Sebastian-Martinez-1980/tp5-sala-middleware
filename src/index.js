const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");
const path = require("node:path");
const PORT = 3000;

const reservas = [
    {
        "id": 1,
        "estudiante": "Victor Hernandez",
        "email": "victorher@gmail.com",
        "sala": "Sala Norte",
        "fecha": "2026-09-22",
        "turno": "Tarde",
        "personas": 3
    },
    {
        "id": 2,
        "estudiante": "Nestor Videla",
        "email": "nestorv@gmail.com",
        "sala": "Sala Sur",
        "fecha": "2026-09-24",
        "turno": "Noche",
        "personas": 1
    }

]

const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
const turnosPermitidos = ["Mañana", "Tarde", "Noche"];
let numeroDeSolicitud = 0;
function identificarSolicitud(req, res, next) {
    numeroDeSolicitud += 1;
    res.locals.solicitud = `BIB-${String(numeroDeSolicitud).padStart(4,"0")}`;
    console.log(`identificarSolicitud : [${res.locals.solicitud}] ${req.method} ${req.originalurl}`);
    next();
}

function medirDuracion(req, res, next) {
    const inicio = process.hrtime.bigint();
    res.on("finish", () => {
        const duracion = Number(process.hrtime.bigint() - inicio) / 1_000_000;
        console.log(
            `duracion: [${res.locals.solicitud}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duracion.toFixed(2)} ms`,
        );
    });
    next();
}

function prepararAreaReservas(req, res, next) {
    res.locals.seccion = "Reservas programadas";
    console.log("seccion: " + res.locals.seccion);
    next();
}

function validarReserva(req, res, next) {
    const estudiante = req.body.estudiante?.trim();
    const email = req.body.email?.trim();
    const sala = req.body.sala?.trim();
    const fecha = req.body.fecha?.trim();
    const turno = req.body.turno?.trim();

    const personasTexto = req.body.personas;
    const personas = Number(personasTexto);

    const errores = [];

    
    if (!estudiante) {
        errores.push("El estudiante es obligatorio.");
    }

    
    if (!email) {
        errores.push("El email es obligatorio.");
    } else {
        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email)) {
            errores.push("El email no tiene un formato válido.");
        }
    }

    
    if (!fecha) {
        errores.push("La fecha es obligatoria.");
    }

    
    if (!personasTexto) {
        errores.push("La cantidad de personas es obligatoria.");
    } else if (!Number.isInteger(personas) || personas < 1 || personas > 6) {
        errores.push("La cantidad de personas debe ser un número entero entre 1 y 6.");
    }

    if (!sala) {
        errores.push("Debes seleccionar una sala.");
    } else if (!salasPermitidas.includes(sala)) {
        errores.push("La sala seleccionada no es válida.");
    }

    
    if (!turno) {
        errores.push("Debes seleccionar un turno.");
    } else if (!turnosPermitidos.includes(turno)) {
        errores.push("El turno seleccionado no es válido.");
    }

    if (errores.length > 0) {
        return res.status(400).render("reservas/nueva", {
            titulo: "Nueva reserva",
            errores,
            valores: req.body,
            salasPermitidas,
            turnosPermitidos
        });
    }

    req.reservaValidada = {
        estudiante,
        email,
        sala,
        fecha,
        turno,
        personas
    };

    next();
}

function crearReserva(req, res) {
    const ultimoId =
        reservas.length === 0 ? 0 : reservas[reservas.length - 1].id;
    reservas.push({
        id: ultimoId + 1,
        ...req.reservaValidada,/* puede ser validado*/
    });
    res.redirect("/reservas");
}

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.set("layout", "layouts/main");
app.use(morgan("dev"));
app.use(identificarSolicitud);
app.use(medirDuracion);
app.use(expressLayouts);
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).render("inicio", { titulo: "Reservas de salas" });
});

app.get("/estado", (req, res) => {
    res.status(200).json({
        servicio: "activo",
        reservas: reservas.length,
        solicitud: res.locals.solicitudId
    })
})

const reservasRouter = express.Router();
reservasRouter.use(prepararAreaReservas);
reservasRouter.get("/", (req, res) => {
    res.status(200).render("reservas/lista", {
        titulo: "reservas",
        reservas,
    })
})


reservasRouter.post("/", validarReserva, crearReserva);
app.use("/reservas", reservasRouter);
reservasRouter.get("/nueva", (req, res) => {
    res.status(200).render("reservas/nueva", {
        titulo: "nueva reserva",
        errores: null,
        error: null, //creo que hay que sacarlo
        valores: {},
        salasPermitidas,
        turnosPermitidos
    })
})

app.get("/reservas/:id", (req, res) => {
    const id = Number(req.params.id);
    const reserva = reservas.find((elemento) => elemento.id === id);
    if (!reserva) {
        return res.status(404).render("no-encontrado", {
            titulo: "Reserva no encontrada",
            mensaje: "No existe una rerserva.",
        });
    }

    res.render("reservas/detalle", {
        titulo: reserva.estudiante,
        reserva,
    });
});

app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`)
})


