import shim = require('fabric-shim');
import { ChaincodeInterface, ChaincodeReponse, Stub } from 'fabric-shim';
import { ERRORS } from './constants/errors';
import { ChaincodeError } from './ChaincodeError';
import { StubHelper } from './StubHelper';
import { Transform } from './utils/datatransform';
import { ConveyorBay } from './ConveyorBay';
import { ConveyorItemType } from '.';
import { ConveyorItem } from './ConveyorItem';

/**
 * The SmartConveyorChaincode class is a base class containing handlers for the `Invoke()` and `Init()` function which are required
 * by `fabric-shim`. The `Init()` function can be overwritten by just implementing it in your SmartConveyorChaincode implementation
 * class.
 */
export class SmartConveyorChaincode implements ChaincodeInterface {

    public logger: any;

    constructor(logLevel?: string) {
        this.logger = shim.newLogger('SmartConveyorChaincode');
        this.logger.level = logLevel || 'debug';
        //Helpers.getLoggerInstance(this.name, logLevel);
    }

    /**
     * the name of the current SmartConveyorChaincode.
     *
     * @readonly
     * @type {string}
     * @memberof SmartConveyorChaincode
     */
    get name(): string {
        return this.constructor.name;
    }

    /**
     * the Default StubHelper with extra functionality and return your own instance.
     *
     * @param {Stub} stub
     * @returns the stub helper for the given stub. This can be used to extend the stub functionality
     * @memberof SmartConveyorChaincode
     */
    getStubHelperFor(stub: Stub) {
        return new StubHelper(stub);

    }

    /**
     * The Init method is called when the Smart Contract is instantiated by the blockchain network
     * Best practice is to have any Ledger initialization in separate function -- see initLedger()
     *
     * @param {Stub} stub
     * @returns {Promise<ChaincodeReponse>}
     * @memberof SmartConveyorChaincode
     */
    async Init(stub: Stub): Promise<ChaincodeReponse> {
        this.logger.info(`=========== Instantiated ${this.name} SmartConveyorChaincode ===========`);
        this.logger.info(`Transaction ID: ${stub.getTxID()}`);
        this.logger.info(`Args: ${stub.getArgs().join(',')}`);
        let args = stub.getArgs();

        /* Init method initializes a List of Bay (allBays) and a List of Type (allTypes)  */

        /* INIT 2 bays initial (with precerence null) */
        let bayOne = new ConveyorBay('1', 10, 0, true, 1);
        let keyBayOne = await this.generateKey(stub, 'BAY', bayOne.id);
        let bayTwo = new ConveyorBay('2', 20, 0, true, 2);
        let keyBayTwo = await this.generateKey(stub, 'BAY', bayTwo.id);
        try {
            await this.generateKey(stub, 'BAY', bayOne.id);
            await stub.putState(keyBayOne, Buffer.from(JSON.stringify(bayOne)));
            await stub.putState(keyBayTwo, Buffer.from(JSON.stringify(bayTwo)));
        } catch (e) {
            this.logger.info(`INIT - ERROR: Something wrong in putState of bays ` + e);
            return shim.error(e);
        }

        /* INIT 5 types initial (Oven, Fridge, WashingMachine, Dishwasher, Dryer) */
        let typeOven = new ConveyorItemType('1', 'Oven');
        let typeFridge = new ConveyorItemType('2', 'Fridge');
        let typeWashingMachine = new ConveyorItemType('3', 'WashingMachine');
        let typeDishwasher = new ConveyorItemType('4', 'Dishwasher');
        let typedryer = new ConveyorItemType('5', 'Dryer');

        try {
            await stub.putState(typeOven.id, Buffer.from(JSON.stringify(typeOven)));
            await stub.putState(typeFridge.id, Buffer.from(JSON.stringify(typeFridge)));
            await stub.putState(typeWashingMachine.id, Buffer.from(JSON.stringify(typeWashingMachine)));
            await stub.putState(typeDishwasher.id, Buffer.from(JSON.stringify(typeDishwasher)));
            await stub.putState(typedryer.id, Buffer.from(JSON.stringify(typedryer)));
        } catch (e) {
            this.logger.info(`INIT - ERROR: Something wrong in putState of types ` + e);
            return shim.error(e);
        }

        /* INIT ADD Prefence Type to Bay Initial */
        try {
            bayOne.addPreference(typeOven);
            bayOne.addPreference(typeFridge);
            await stub.putState(keyBayOne, Buffer.from(JSON.stringify(bayOne)));
            await stub.putState(await this.generateKey(stub, 'BAY', bayOne.id), Buffer.from(JSON.stringify(bayOne)));

            bayTwo.addPreference(typeWashingMachine);
            bayTwo.addPreference(typeDishwasher);
            bayTwo.addPreference(typedryer);
            await stub.putState(keyBayTwo, Buffer.from(JSON.stringify(bayTwo)));
        } catch (e) {
            this.logger.info(`INIT - ERROR: Something wrong in addPreference of bay ` + e);
            return shim.error(e);
        }

        return await this.executeMethod('init', args, stub, true);
    }

    /**
     * The Invoke method is called as a result of an application request to run the Smart Contract.
     * The calling application program has also specified the particular smart contract
     * function to be called, with arguments
     *
     * @param {Stub} stub
     * @returns {Promise<ChaincodeReponse>}
     * @memberof SmartConveyorChaincode
     */
    async Invoke(stub: Stub): Promise<ChaincodeReponse> {

        this.logger.info(`=========== Invoked SmartConveyorChaincode ${this.name} ===========`);
        this.logger.info(`Transaction ID: ${stub.getTxID()}`);
        this.logger.info(`Args: ${stub.getArgs().join(',')}`);

        let ret = stub.getFunctionAndParameters();
        let fcn = ret.fcn;
        let args = ret.params;

        this.logger.info('Invoke function: ' + fcn);

        return await this.executeMethod(ret.fcn, ret.params, stub);
    }

    /**
     * Handle custom method execution
     *
     * @param {string} fcn
     * @param {string[]} params
     * @param stub
     * @param {boolean} silent
     * @returns {Promise<any>}
     */
    private async executeMethod(fcn: string, params: string[], stub: Stub, silent = false) {
        let method = this[fcn];

        if (!method) {
            if (!silent) {
                this.logger.error(`no function of name: ${fcn} found`);

                throw new ChaincodeError(ERRORS.UNKNOWN_FUNCTION_ERROR, {
                    'function': fcn
                });
            } else {
                return shim.success(); /* fcn null and silent = true */
            }
        }

        try {
            this.logger.debug(`============= START : ${fcn} ===========`);

            // let payload = await method.call(this, this.getStubHelperFor(stub), params);
            // ascatox Using this.getStubHelper is impossible to test :-(
            let payload = await method.call(this, stub, params);

            if (payload && !Buffer.isBuffer(payload)) {
                payload = Buffer.from(JSON.stringify(Transform.normalizePayload(payload)));
            }

            this.logger.debug(`============= END : ${fcn} ===========`);

            return shim.success(payload);

        } catch (err) {
            let error = err;

            const stacktrace = err.stack;

            if (!(err instanceof ChaincodeError)) {
                error = new ChaincodeError(ERRORS.UNKNOWN_ERROR, {
                    'message': err.message
                });
            }
            this.logger.error(stacktrace);
            this.logger.error(`Data of error ${err.message}: ${JSON.stringify(err.data)}`);

            return shim.error(error.serialized);
        }
    }

    /* methods POST */
    /* controlBays() */
    /* The controlBays method is called to extract and control all bays  */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    private async controlBays(stub: Stub) {
        // logger.info('########### controlBays ###########');
        let iterator = await stub.getStateByPartialCompositeKey('BAY', []);
        let bays = await Transform.iteratorToObjectList(iterator);
        let displayDate = new Date();
        displayDate.setSeconds((displayDate.getSeconds() - 15));

        for (let bay of bays) {
            let baia = bay as ConveyorBay;
            if (baia.datetime < displayDate) {
                this.logger.info('ConveyorBay with id: ' + baia.id + 'switched OFF due to inactivity ');
                baia.enable = false;
                this.editConveyorBay(stub, JSON.stringify(baia));

                let items = new Array<ConveyorItem>();
                items = await this.getItemsByBay(stub, baia.id);
                for (let item of items) {
                    this.assignBayToItem(stub, item);
                }
            }
        }
        return shim.success();
    }

    /* methods POST */
    /* assignBayToItem */
    /* The assignBayToItem method is called to assign a exit bay to item in parameter */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    private async assignBayToItem(stub: Stub, item: ConveyorItem) {
        let iterator = await stub.getStateByPartialCompositeKey('BAY', []);
        let bays = await Transform.iteratorToObjectList(iterator);
        let baysCompatible = Array<ConveyorBay>();
        let baysAvailable = Array<ConveyorBay>();
        for (let bay of bays) {
            let baia = bay as ConveyorBay;
            if (baia.enable) {
                if (baia.capacity > baia.load) {
                    if (baia.preference.includes(item.type)) {
                        baysCompatible.push(baia);
                    } else {
                        baysAvailable.push(baia);
                    }

                }
            }
        }

        let baySelected: ConveyorBay;
        if (baysCompatible.length != 0) {
            if (baysCompatible.length != 1) {
                this.OrderByArray(baysCompatible, 'load');
            }
            baySelected = baysCompatible[0];
        } else {
            if (baysAvailable.length != 0) {
                if (baysAvailable.length != 1) {
                    this.OrderByArray(baysAvailable, 'load');
                }

                baySelected = baysAvailable[0];
            } else {
                this.logger.info(`storeConveyorItem - ERROR: NO Bays available for Item` + item.id);
                return shim.error(`storeConveyorItem - ERROR: NO Bays available for Item` + item.id);
            }
        }
        // NEW EVENT
        baySelected.load++;
        item.conveyorBay = baySelected;
        item.state = ConveyorItem.State.InConveyorBelt;
        try {
            let keyItem = await this.generateKey(stub, 'ITEM', item.id);
            stub.putState(keyItem, Buffer.from(JSON.stringify(item)));
        } catch (e) {
            this.logger.info(`storeConveyorItem - ERROR: Something wrong in putState of item ` + e);
            return shim.error(e);
        }

        try {
            let keyBay = await this.generateKey(stub, 'BAY', baySelected.id);
            stub.putState(keyBay, Buffer.from(JSON.stringify(baySelected)));
        } catch (e) {
            this.logger.info(`storeConveyorItem - ERROR: Something wrong in putState of bay ` + e);
            return shim.error(e);
        }
    }

    private async OrderByArray(values: any[], orderType: any) {
        return values.sort((a, b) => {
            if (a[orderType] < b[orderType]) {
                return -1;
            }

            if (a[orderType] > b[orderType]) {
                return 1;
            }
            return 0;
        });
    }

    /* methods POST */
    /* storeConveyorItem() */
    /* The storeConveyorItem method is called to insert a Item in the Conveyor Belt */
    /* A exit Bay will be assigned to new Item */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    private async storeConveyorItem(stub: Stub, itemStr: string) {
        // logger.info('########### storeConveyorItem ###########');
        if (!itemStr) {
            return shim.error(`storeConveyorItem - ERROR: NO Item in Input`);
        }
        /* Control all bays on - off */
        await this.controlBays(stub);
        const item: ConveyorItem = JSON.parse(itemStr);
        await this.assignBayToItem(stub, item);

        return shim.success();
    }

    /* methods POST */
    /* editConveyorBay() */
    /* The editeConveyorBay method is called to update a Bay */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    private async editConveyorBay(stub: Stub, bayStr: string) {
        // logger.info('########### editConveyorbay ###########');
        if (!bayStr) {
            return shim.error(`editConveyorBay - ERROR: NO Bay in Input`);
        }

        try {
            const bay: ConveyorBay = JSON.parse(bayStr);
            let keyBay = await this.generateKey(stub, 'ITEM', bay.id);
            await stub.putState(keyBay, Buffer.from(JSON.stringify(bay)));
            return shim.success();
        } catch (e) {
            this.logger.info(`editConveyorbay - ERROR: Something wrong in putState of bay ` + e);
            return shim.error(e);
        }
    }

    /* methods POST */
    /* conveyorItemIntoConveyorBay() */
    /* The conveyorItemIntoConveyorBay method is called to update a Bay and update the items in the Conveyor Belt */
    /* When the Bay "captures" a Item from the Conveyor Belt, it is removed from the Map (state inBay)  */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    private async conveyorItemIntoConveyorBay(stub: Stub, item: ConveyorItem) {
        // logger.info('########### assignementConveyorItemToConveyorBay ###########');

        /* Control all bays on - off */
        await this.controlBays(stub);

        // NEW EVENT
        item.conveyorBay.load--;
        item.state = ConveyorItem.State.InBay;
        try {
            let keyItem = await this.generateKey(stub, 'ITEM', item.id);
            stub.putState(keyItem, Buffer.from(JSON.stringify(item)));
        } catch (e) {
            this.logger.info(`conveyorItemIntoConveyorBay - ERROR: Something wrong in putState of item ` + e);
            return shim.error(e);
        }

        try {
            let keyBay = await this.generateKey(stub, 'BAY', item.conveyorBay.id);
            let bay = item.conveyorBay;
            stub.putState(keyBay, Buffer.from(JSON.stringify(bay)));
        } catch (e) {
            this.logger.info(`conveyorItemIntoConveyorBay - ERROR: Something wrong in putState of bay ` + e);
            return shim.error(e);
        }
    }

    /* methods POST */
    /* conveyorItemOutConveyorBay() */
    /* The conveyorItemOutConveyorBay method is called to update a Bay and update the items in the Conveyor Belt */
    /* When the Bay release a Item, it is removed from the Bay and the state is Released */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    private async conveyorItemOutConveyorBay(stub: Stub, item: ConveyorItem) {
        // logger.info('########### assignementConveyorItemToConveyorBay ###########');

        /* Control all bays on - off */
        await this.controlBays(stub);

        if (item) {
            try {
                item.state = ConveyorItem.State.Released;
                let keyItem = await this.generateKey(stub, 'ITEM', item.id);
                await stub.putState(keyItem, Buffer.from(JSON.stringify(item)));
                return shim.success();
            } catch (e) {
                this.logger.info(`conveyorItemOutConveyorBay - ERROR: Something wrong in putState of item ` + e);
                return shim.error(e);
            }
        }
    }

    /* methods GET */
    /* getItemsByBay() */
    /* The getItemsByBay method is called to GET a subset of "Map" with all items assigned at this Bay */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    private async getItemsByBay(stub: Stub, bayId: string) {
        // logger.info('########### getItemsByBay ###########');

        let itemsAssigned = Array<ConveyorItem>();
        if (bayId == null || bayId == '') {
            return itemsAssigned;
        }
        let iterator = await stub.getStateByPartialCompositeKey('ITEM', []);
        let items = await Transform.iteratorToObjectList(iterator);

        for (let item of items) {
            let elemItem = item as ConveyorItem;
            if (elemItem.conveyorBay.id == bayId && elemItem.state == ConveyorItem.State.InConveyorBelt) {
                itemsAssigned.push(elemItem);
            }
        }
        return itemsAssigned;
    }

    private async  generateKey(stub: Stub, type: string, id: string) {
        // logger.info('########### generateKey ###########');
        return stub.createCompositeKey(type, [id]);

    }
}