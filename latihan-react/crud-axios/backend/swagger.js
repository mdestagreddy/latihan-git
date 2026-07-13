const swaggerAutogen = require('swagger-autogen')()

const doc = {
    info: {
        version: "1.0.0",
        title: "API Movie",
        description: "Dokumentasi API Movie"
    },
    host: `localhost:${process.env.PORT || 3000}`,
    basePath: "/",
    //schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
            }
        }
    },
    securityDefinitions: {
        bearerAuth:{
            type: "apiKey",
            in: "header",
            name: "Authorization",
            description: "Masukkan akses API Token"
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ]
}

const outputFile = './swagger-output.json'
const endpointsFiles = ['./index.js']

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    require('./index')
})