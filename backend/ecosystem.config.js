module.exports = {
  apps: [
    {
      name: "concrete-mixer-api",
      script: "src/server.js",
      instances: 1, // Single instance for development, scale for production
      exec_mode: "cluster",

      // Environment variables
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },

      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Restart configuration
      watch: false, // Set to true for development
      ignore_watch: ["node_modules", "logs", "*.log"],

      // Logging
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Auto restart
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: "10s",

      // Memory management
      max_memory_restart: "500M",

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,

      // Source map support
      source_map_support: true,

      // Instance variables
      instance_var: "INSTANCE_ID",
    },
  ],

  deploy: {
    production: {
      user: "root",
      host: "your-server-ip",
      ref: "origin/main",
      repo: "your-repository-url",
      path: "/var/www/concrete-mixer-rental",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
