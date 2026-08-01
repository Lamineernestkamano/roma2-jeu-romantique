require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const https = require("https");

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
            "Erreur de lecture des réponses :",
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


/* ==============================
   ENVOI EMAIL AVEC RESEND
============================== */

function sendEmail(response) {

    return new Promise(
        function (resolve, reject) {

            const apiKey =
                process.env.RESEND_API_KEY;

            const notifyEmail =
                process.env.NOTIFY_EMAIL;

            if (
                !apiKey ||
                !notifyEmail
            ) {

                console.log(
                    "RESEND_API_KEY ou NOTIFY_EMAIL manquant."
                );

                return resolve();

            }


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


            const emailData =
                JSON.stringify({

                    from:
                        "onboarding@resend.dev",

                    to:
                        [notifyEmail],

                    subject:
                        "❤️ Nouvelle réponse de Hadiatou",

                    html:

`
<h2>❤️ Hadiatou a répondu à ton invitation</h2>

<p>
<strong>Date :</strong>
${escapeHtml(formattedDate)}
</p>

<p>
<strong>Heure :</strong>
${escapeHtml(response.time)}
</p>

<p>
<strong>Lieu :</strong>
${escapeHtml(response.place)}
</p>

<p>
<strong>Message :</strong>
${escapeHtml(
    response.note ||
    "(aucun message)"
)}
</p>

<hr>

<p>
Réponse reçue le :
${escapeHtml(
    response.created_at
)}
</p>
`

                });


            const request =
                https.request(

                    {
                        hostname:
                            "api.resend.com",

                        path:
                            "/emails",

                        method:
                            "POST",

                        headers:
                            {
                                "Authorization":
                                    "Bearer " +
                                    apiKey,

                                "Content-Type":
                                    "application/json",

                                "Content-Length":
                                    Buffer.byteLength(
                                        emailData
                                    )
                            }
                    },

                    function (res) {

                        let body =
                            "";


                        res.on(
                            "data",
                            function (chunk) {

                                body +=
                                    chunk;

                            }
                        );


                        res.on(
                            "end",
                            function () {

                                if (
                                    res.statusCode >= 200 &&
                                    res.statusCode < 300
                                ) {

                                    console.log(
                                        "Email envoyé avec succès via Resend."
                                    );

                                    resolve();

                                } else {

                                    console.error(
                                        "Erreur Resend :",
                                        res.statusCode,
                                        body
                                    );

                                    reject(
                                        new Error(
                                            "Erreur Resend " +
                                            res.statusCode
                                        )
                                    );

                                }

                            }
                        );

                    }
                );


            request.on(
                "error",
                function (error) {

                    reject(
                        error
                    );

                }
            );


            request.write(
                emailData
            );


            request.end();

        }
    );

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
   LANCEMENT
============================== */

app.listen(
    PORT,
    function () {

        console.log(

            `Site disponible sur http://localhost:${PORT}`

        );

    }
);