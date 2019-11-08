import es from "event-stream";
import moment from "moment";
import { ObjectID } from "mongodb";
import { Edm, odata } from "odata-v4-server";
import { streamTrades } from "paper-trade";
import connect from "../connect";
import { Trade } from "./Trade";

const collectionName = "paperTrade";

export class PaperTrade {
  @Edm.Key
  @Edm.Computed
  @Edm.String
  // tslint:disable-next-line: variable-name
  public _id: ObjectID;

  @Edm.String
  public exchange: string;

  @Edm.String
  public currency: string;

  @Edm.String
  public asset: string;

  @Edm.Double
  public period: number;

  @Edm.String
  public begin: string;

  @Edm.String
  public end: string;

  @Edm.String
  public indicators: string;

  @Edm.String
  public code: string;

  @Edm.Double
  public initialBalance: number;

  @Edm.Double
  public finalBalance: number;

  @Edm.Double
  public profit: number;

  @Edm.Collection(Edm.EntityType(Edm.ForwardRef(() => Trade)))
  public Trades: Trade[];

  constructor(data: any) {
    Object.assign(this, data);
  }

  @Edm.Action
  public async execute(@odata.result result: any): Promise<number> { // FIXME должна обрываться после успешного запуска?
    const { _id: key } = result;
    // tslint:disable-next-line: variable-name
    const _id = new ObjectID(key);
    const db = await connect();
    const paperTrade = new PaperTrade(
      await db.collection(collectionName).findOne({ _id })
    );
    const {
      asset,
      currency,
      exchange,
      period,
      indicators,
      code,
      initialBalance
    } = paperTrade;

    const rs = streamTrades({
      exchange,
      currency,
      asset,
      period: "" + period,
      start: moment().utc().toISOString(),
      indicators: JSON.parse(indicators),
      code,
      initialBalance
    });

    let finalBalance: number;
    const tradesCollection = await db.collection("trade");
    await tradesCollection.deleteMany({ parentId: _id });

    rs.pipe(
      es.map((chunk: any, next: any) => {
        const doc: { amount: number; parentId?: ObjectID } = JSON.parse(chunk);
        doc.parentId = _id;
        finalBalance = doc.amount;
        tradesCollection.insertOne(doc, next);
      })
    );

    await new Promise(resolve => {
      rs.on("end", resolve);
    });

    return db
      .collection(collectionName)
      .updateOne(
        { _id },
        {
          $set: {
            finalBalance: Math.abs(finalBalance)
          }
        }
      )
      .then(r => r.modifiedCount);
  }
}
