import morgan from "morgan";
import { Request, Response } from "express";

// Custom token for response time with color coding
morgan.token("colored-response-time", (req: Request, res: Response) => {
  const responseTime = parseFloat(
    (morgan as any)["response-time"](req, res) || "0"
  );

  if (responseTime < 100) {
    return `\x1b[32m${responseTime}ms\x1b[0m`; // Green for fast responses
  } else if (responseTime < 500) {
    return `\x1b[33m${responseTime}ms\x1b[0m`; // Yellow for moderate responses
  } else {
    return `\x1b[31m${responseTime}ms\x1b[0m`; // Red for slow responses
  }
});

// Custom token for status code with color coding
morgan.token("colored-status", (req: Request, res: Response) => {
  const status = res.statusCode;

  if (status >= 200 && status < 300) {
    return `\x1b[32m${status}\x1b[0m`; // Green for success
  } else if (status >= 300 && status < 400) {
    return `\x1b[36m${status}\x1b[0m`; // Cyan for redirects
  } else if (status >= 400 && status < 500) {
    return `\x1b[33m${status}\x1b[0m`; // Yellow for client errors
  } else {
    return `\x1b[31m${status}\x1b[0m`; // Red for server errors
  }
});

// Custom development format with colors and better formatting
const devFormat =
  ":method :url :colored-status :res[content-length] - :colored-response-time";

// Enhanced combined format for production with more details
const productionFormat =
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

// Logger configuration based on environment
export const requestLogger = (
  environment: string = process.env.NODE_ENV || "development"
) => {
  if (environment === "production") {
    return morgan(productionFormat, {
      // Skip logging for health checks and static assets in production
      skip: (req: Request) => {
        return (
          req.url === "/health" ||
          req.url.startsWith("/favicon") ||
          req.url.startsWith("/robots.txt")
        );
      },
    });
  } else if (environment === "test") {
    // Minimal logging for tests
    return morgan("tiny", {
      skip: () => true, // Skip all logging in test environment
    });
  } else {
    // Development environment with colored output
    return morgan(devFormat, {
      // Skip only health checks in development
      skip: (req: Request) => req.url === "/health",
    });
  }
};

// Error logger for failed requests
export const errorLogger = morgan("combined", {
  skip: (req: Request, res: Response) => res.statusCode < 400,
});

// API analytics logger (can be used for metrics)
export const analyticsLogger = morgan(
  ":method :url :status :response-time ms :res[content-length]",
  {
    stream: {
      write: (message: string) => {
        // Here you could send logs to external services like DataDog, CloudWatch, etc.
        // For now, we'll just log to console in a structured format
        const parts = message.trim().split(" ");
        if (parts.length >= 5) {
          const logData = {
            method: parts[0],
            url: parts[1],
            status: parseInt(parts[2]),
            responseTime: parseFloat(parts[3]),
            contentLength: parts[5] !== "-" ? parseInt(parts[5]) : 0,
            timestamp: new Date().toISOString(),
          };

          // Only log API endpoints, skip static files and health checks
          if (
            logData.url.startsWith("/api/") &&
            logData.url !== "/api/health"
          ) {
            console.log("API_ANALYTICS:", JSON.stringify(logData));
          }
        }
      },
    },
  }
);
