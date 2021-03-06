import { Request, Response, Router } from "express";
import axios from "axios";
import { processResponse } from "../annotator/content";
import _ from "lodash";
import config from "../config";

const router = Router();

const annotatorPath = "/annotator";
const proxyUrl = `${config.serverPath}${annotatorPath}`;

router.get(annotatorPath, (req: Request, res: Response) => {
  const url = req.query.url as string;
  const root = !_.isEmpty(req.query.root);

  if (_.isEmpty(url)) {
    res.status(400).send();
  } else {
    proxyRequest(url, root, req, res);
  }
});


function proxyRequest(url: string, root: boolean, req: Request, res: Response) {
  axios
    .get(url, {
      responseType: "arraybuffer",
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "en-GB,en-US",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.80 Safari/537.36",
        ...(req.headers.cookie ? { "cookie": req.headers.cookie } : {})
      }
    })
    .then(response => {
      const {contentType, data} = processResponse(proxyUrl, url, root, response);
      res.setHeader("content-type", contentType);
      res.send(data);
    })
    .catch(error => {
      console.log(error.toString());
      const status = _.get(error, "response.status", 500);
      res.status(status).send(createErrorPage(error.toString()));
    });
}


function createErrorPage(error: string): string {
  const script = `parent.postMessage({ "type": "iframe.error", "error": "${error}" }, "*")`;
  return `<html><body><script>${script}</script></body></html>`;
}

export default router;
