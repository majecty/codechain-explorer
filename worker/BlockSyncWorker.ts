import { scheduleJob, Job } from "node-schedule";
import { WorkerConfig } from "./";
import { CodeChainAgent } from "./CodeChainAgent";
import { ElasticSearchAgent } from "../db/ElasticSearchAgent";
import { Block, H256 } from "codechain-sdk/lib/core/classes";
import { BlockDoc } from "../db/DocType";
import * as _ from "lodash";

export class BlockSyncWorker {
    private watchJob: Job;
    private config: WorkerConfig;
    private codeChainAgent: CodeChainAgent;
    private elasticSearchAgent: ElasticSearchAgent;

    constructor(config: WorkerConfig, codeChainAgent: CodeChainAgent, elasticSearchAgent: ElasticSearchAgent) {
        this.config = config;
        this.codeChainAgent = codeChainAgent;
        this.elasticSearchAgent = elasticSearchAgent;
    }

    public start() {
        this.startSync();
    }

    public destroy() {
        if (this.watchJob) {
            this.watchJob.cancel(false);
            this.watchJob = null;
        }
    }

    private async startSync() {
        try {
            await this.sync();
        } catch (error) {
            console.error(error);
            return;
        }
        this.watchJob = scheduleJob(this.config.cron.blockWatch, () => {
            this.sync();
        });
    }

    private async sync() {
        console.log("================ sync start ==================");
        await this.elasticSearchAgent.checkIndexOrCreate();
        let latestSyncBlockNumber: number = await this.elasticSearchAgent.getLastBlockNumber();
        const latestCodechainBlockNumber: number = await this.codeChainAgent.getLastBlockNumber();
        if (latestSyncBlockNumber === -1) {
            console.log("There is no synchronized block");
        } else {
            console.log("lastest indexed block number : %d", latestSyncBlockNumber);
        }
        console.log("lastest codechain block number : %d", latestCodechainBlockNumber);
        while (latestSyncBlockNumber < latestCodechainBlockNumber) {
            const nextBlockIndex: number = latestSyncBlockNumber + 1;
            const nextBlock: Block = await this.codeChainAgent.getBlock(nextBlockIndex);
            if (latestSyncBlockNumber > 0) {
                const lastSyncBlock: BlockDoc = await this.elasticSearchAgent.getBlock(latestSyncBlockNumber);
                if (nextBlock.parentHash.value !== lastSyncBlock.hash) {
                    latestSyncBlockNumber = await this.checkRetractAndReturnSyncNumber(latestSyncBlockNumber);
                    continue;
                }
            }

            await this.elasticSearchAgent.addBlock(nextBlock);
            console.log("%d block is synchronized", nextBlockIndex);
            latestSyncBlockNumber = nextBlockIndex;
        }
        console.log("========== indexing pending parcels ==========");
        const pendingParcels = await this.codeChainAgent.getPendingParcels();
        const indexedParcels = await this.elasticSearchAgent.getCurrentPendingParcels();

        console.log("current indexed pending parcels : %d", indexedParcels.length);
        console.log("codechain pending parcels : %d", pendingParcels.length);

        // Update pending parcel status
        const pendingParcelHashList = _.map(pendingParcels, (p) => p.hash().value);
        const removedPendingParcels = _.filter(indexedParcels, indexedParcel => !_.includes(pendingParcelHashList, indexedParcel.parcel.hash));
        Promise.all(_.map(removedPendingParcels, async (removedPendingParcel) => {
            const blockedParcel = await this.elasticSearchAgent.getParcel(new H256(removedPendingParcel.parcel.hash));
            if (blockedParcel) {
                return this.elasticSearchAgent.removePendingParcel(new H256(removedPendingParcel.parcel.hash));
            } else {
                return this.elasticSearchAgent.deadPendingParcel(new H256(removedPendingParcel.parcel.hash));
            }
        }));

        // Index new pending parcel
        const indexedPendingParcelHashList = _.map(indexedParcels, (p) => p.parcel.hash);
        const newPendingParcels = _.filter(pendingParcels, pendingParcel => !_.includes(indexedPendingParcelHashList, pendingParcel.hash().value));
        Promise.all(_.map(newPendingParcels, async (pendingParcel) => {
            return this.elasticSearchAgent.addPendingParcel(newPendingParcels, pendingParcel);
        }));

        // Revival pending parcel
        const deadPendingParcels = await this.elasticSearchAgent.getDeadPendingParcels();
        const deadPendingParcelHashList = _.map(deadPendingParcels, (p) => p.parcel.hash);
        const revivalPendingParcels = _.filter(pendingParcels, pendingParcel => _.includes(deadPendingParcelHashList, pendingParcel.hash().value));
        Promise.all(_.map(revivalPendingParcels, async (revivalPendingParcel) => {
            return this.elasticSearchAgent.revialPendingParcel(revivalPendingParcel.hash());
        }));

        console.log("================ sync done ===================\n");
    }

    private checkRetractAndReturnSyncNumber = async (currentBlockNumber): Promise<number> => {
        while (currentBlockNumber > -1) {
            const lastSynchronizedBlock: BlockDoc = await this.elasticSearchAgent.getBlock(currentBlockNumber);
            const codechainBlock: Block = await this.codeChainAgent.getBlock(currentBlockNumber);

            if (codechainBlock.hash.value === lastSynchronizedBlock.hash) {
                break;
            }

            console.log("%d block is retracted", currentBlockNumber);
            await this.elasticSearchAgent.retractBlock(new H256(lastSynchronizedBlock.hash));
            currentBlockNumber--;
        }
        return currentBlockNumber;
    }
}
