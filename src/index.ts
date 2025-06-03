import express from "express";
import cors from "cors";
import quoteHandler from "./api/quote";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.send("hello");
});

app.post("/api/quote", quoteHandler);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
