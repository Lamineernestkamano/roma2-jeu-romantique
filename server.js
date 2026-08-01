require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "change-moi";

const DATA_FILE = path.join(__dirname, "responses.json");

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

function loadResponses() {
    if (!fs.existsSync(DATA_FILE)) {
        return [];
    }

    try {
        return JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );
    } catch (error) {
        console.error(
            "Erreur de lecture de la base de données :",
            error
        );

        return [];
    }
}

function saveResponses(responses) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(responses, null, 2),
        "utf8"
    );
}

function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTime(value) {
    return /^\d{2}:\d{2}$/.test(value);
}

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        function (character) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        }
    );
}

async function sendEmail(response) {

    if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS ||
        !process.env.NOTIFY_EMAIL
    ) {
        console.log(
            "Email non configuré. La réponse est enregistrée."
        );

        return;
    }

    const transporter =
        nodemailer.createTransport({

            host:
                process.env.SMTP_HOST,

            port:
                Number(
                    process.env.SMTP_PORT || 587
                ),

            secure:
                String(
                    process.env.SMTP_SECURE || "false"
                ) === "true",

            auth: {
                user:
                    process.env.SMTP_USER,

                pass:
                    process.env.SMTP_PASS
            }

        });


    const formattedDate =
        new Date(
            response.date + "T00:00:00"
        ).toLocaleDateString(
            "fr-FR",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );


    await transporter.sendMail({

        from:
            process.env.MAIL_FROM ||
            process.env.SMTP_USER,

        to:
            process.env.NOTIFY_EMAIL,

        subject:
            "❤️ Nouvelle réponse de Hadiatou",

        text:

`Hadiatou a répondu à ton invitation ❤️

Date : ${formattedDate}

Heure : ${response.time}

Lieu : ${response.place}

Message :
${response.note || "(aucun message)"}

Réponse reçue le :
${response.created_at}
`

    });

}


/* ==============================
   ENREGISTRER UNE RÉPONSE
============================== */

app.post(
    "/api/responses",
    async function (req, res) {

        try {

            const {
                date,
                time,
                place,
                note = ""
            } = req.body || {};


            if (
                !validDate(date) ||
                !validTime(time) ||
                !place
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Données invalides"
                    });

            }


            if (
                String(note).length > 2000
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Message trop long"
                    });

            }


            const responses =
                loadResponses();


            const response = {

                id:
                    Date.now(),

                date:
                    date,

                time:
                    time,

                place:
                    place,

                note:
                    String(note).trim(),

                created_at:
                    new Date().toISOString()

            };


            responses.push(
                response
            );


            saveResponses(
                responses
            );


            try {

                await sendEmail(
                    response
                );

            } catch (emailError) {

                console.error(
                    "Erreur d'envoi de l'email :",
                    emailError.message
                );

            }


            res.json({

                ok:
                    true,

                id:
                    response.id

            });


        } catch (error) {

            console.error(
                error
            );


            res
                .status(500)
                .json({

                    error:
                        "Erreur serveur"

                });

        }

    }
);


/* ==============================
   PAGE ADMIN PRIVÉE
============================== */

app.get(
    "/admin",
    function (req, res) {

        const token =
            req.query.token;


        if (
            !token ||
            token !== ADMIN_TOKEN
        ) {

            return res
                .status(401)
                .send(
                    "Accès refusé"
                );

        }


        const responses =
            loadResponses();


        const cards =
            responses
                .reverse()
                .map(
                    function (response) {

                        const formattedDate =
                            new Date(
                                response.date +
                                "T00:00:00"
                            ).toLocaleDateString(
                                "fr-FR",
                                {
                                    weekday:
                                        "long",

                                    day:
                                        "numeric",

                                    month:
                                        "long",

                                    year:
                                        "numeric"
                                }
                            );


                        return `

                        <div class="box">

                            <div class="date">

                                ${escapeHtml(
                                    formattedDate
                                )}

                                à

                                ${escapeHtml(
                                    response.time
                                )}

                            </div>

                            <p>

                                <strong>
                                    Lieu :
                                </strong>

                                ${escapeHtml(
                                    response.place
                                )}

                            </p>

                            <p>

                                <strong>
                                    Message :
                                </strong>

                                ${escapeHtml(
                                    response.note ||
                                    "(aucun message)"
                                )}

                            </p>

                            <small>

                                Reçu le :

                                ${escapeHtml(
                                    response.created_at
                                )}

                            </small>

                        </div>

                        `;

                    }
                )
                .join("");


        res.send(`

<!DOCTYPE html>

<html lang="fr">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,
initial-scale=1.0">

<title>
Mes réponses ❤️
</title>

<style>

body {

    font-family:
    Arial,
    sans-serif;

    margin:
    30px;

    background:
    #f7eee9;

    color:
    #3d252c;

}

h1 {

    color:
    #7d2948;

}

.box {

    background:
    white;

    padding:
    20px;

    margin:
    15px 0;

    border-radius:
    10px;

    box-shadow:
    0 5px 20px
    rgba(0,0,0,.08);

}

.date {

    font-weight:
    bold;

    color:
    #7d2948;

}

</style>

</head>

<body>

<h1>
❤️ Réponses reçues
</h1>

${
    cards ||
    "<p>Aucune réponse pour le moment.</p>"
}

</body>

</html>

        `);

    }
);


/* ==============================
   LANCEMENT DU SERVEUR
============================== */

app.listen(
    PORT,
    function () {

        console.log(

            `Site disponible sur http://localhost:${PORT}`

        );

    }
);