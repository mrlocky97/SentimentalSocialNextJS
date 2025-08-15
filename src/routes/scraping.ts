// Thin legacy compatibility wrapper for scraping routes.
// Full implementation now lives under routes/modules/scraping/*
import scrapingRouter from "./modules/scraping";
export const scrapingRoutes = scrapingRouter;
export default scrapingRouter;
