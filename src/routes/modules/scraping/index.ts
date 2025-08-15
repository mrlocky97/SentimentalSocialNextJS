import { Router } from "express";
import {
    forceReauth,
    getScrapingStatus,
    listTweets,
    scrapeHashtag,
    scrapeSearch,
    scrapeUser,
} from "./handlers";

const router = Router();

/** @swagger tags: - name: Twitter Scraping description: Tweet scraping & sentiment */

router.post("/hashtag", scrapeHashtag);
router.post("/user", scrapeUser);
router.post("/search", scrapeSearch);
router.get("/status", getScrapingStatus);
router.post("/reauth", forceReauth);
router.get("/tweets", listTweets);

export default router;
