import { odata, ODataServer } from "odata-v4-server";
import { PaperTradeController } from "./controllers/PaperTrade";

@odata.cors
@odata.namespace("PaperTrade")
@odata.controller(PaperTradeController, true)
export class PaperTradeServer extends ODataServer {}
