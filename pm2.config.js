module.exports = {
	apps: [
		{
			name: 's4a-detector-api-server',
			cwd: './server',
			interpreter: '/bin/sh',
			script: 'yarn',
//                        exec_mode : 'cluster',
			args: 'prodenv', // process.env.NODE_ENV ?
			env: {
				NODE_ENV: 'production',
				MONGODB_HOST: process.env.MONGODB_HOST,
				MONGODB_PORT: process.env.MONGODB_PORT,
				MONGODB_DATABASE: process.env.MONGODB_DATABASE,
				MONGODB_USER: process.env.MONGODB_USER,
				MONGODB_PASSWORD: process.env.MONGODB_PASSWORD,
				CENTRAL_API_URL: process.env.CENTRAL_API_URL,
				API_HOST: process.env.API_HOST,
				API_PORT: process.env.API_PORT,
				API_REST_ROOT_URL: process.env.API_REST_ROOT_URL,
                PATH_BASE: process.env.PATH_BASE,
                PATH_CSR_SIGNED: process.env.PATH_CSR_SIGNED,
                PATH_CSR_UNSIGNED: process.env.PATH_CSR_UNSIGNED,
                PATH_SURICATA_RULES_OUT: process.env.PATH_SURICATA_RULES_OUT,
                PATH_MOLOCH_YARA_OUT: process.env.PATH_MOLOCH_YARA_OUT,
                PATH_MOLOCH_WISE_IP_OUT: process.env.PATH_MOLOCH_WISE_IP_OUT,
                PATH_MOLOCH_WISE_URL_OUT: process.env.PATH_MOLOCH_WISE_URL_OUT,
                PATH_MOLOCH_WISE_DOMAIN_OUT: process.env.PATH_MOLOCH_WISE_DOMAIN_OUT,
                DEBUG_LEVEL: process.env.DEBUG_LEVEL,
                DEBUG: process.env.DEBUG
			}
		},
		{
			name: 's4a-detector-client',
			cwd: './client',
			interpreter: '/bin/sh',
			script: 'yarn',
//                        exec_mode : 'cluster',
			args: 'prodenv', // process.env.NODE_ENV ?
			env: {
				NODE_ENV: 'production',
				API_URL: process.env.API_URL,
				API_URL_BROWSER: process.env.API_URL_BROWSER,
                DEBUG_LEVEL: process.env.DEBUG_LEVEL,
                DEBUG: process.env.DEBUG
			}
		}
	]
}