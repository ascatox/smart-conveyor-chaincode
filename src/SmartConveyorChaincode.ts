import shim = require('fabric-shim');
import { ChaincodeInterface, ChaincodeReponse, Stub } from 'fabric-shim';
import { ERRORS } from './constants/errors';
import { ChaincodeError } from './ChaincodeError';
import { StubHelper } from './StubHelper';
import { Transform } from './utils/datatransform';
import { ConveyorBay } from './ConveyorBay';
import { ConveyorItemType } from '.';
import { ConveyorItem } from './ConveyorItem';
import { EventPayload } from '../dist/src/EventPayload';

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
        // this.logger = Helpers.getLoggerInstance(this.name, logLevel);
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
    public async storeConveyorItem(stub: Stub, itemStr: string) {
        this.logger.info('########### storeConveyorItem ###########');
        if (!itemStr) {
            throw new Error(`storeConveyorItem - ERROR: NO Item in Input`);
        }
        const item: ConveyorItem = JSON.parse(itemStr);
        /* Control all bays on - off */
        await this.controlBays(stub);
        await this.assignBayToItem(stub, item);
    }

    /* methods POST */
    /* doEditConveyorBay() */
    /* The editeConveyorBay method is called to update a Bay */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    public async editConveyorBay(stub: Stub, bay: string) {
        this.logger.info('########### editConveyorBay ###########');
        if (!bay) {
            throw new Error(`editConveyorBay - ERROR: NO Bay in Input`);
        }
        await this.doEditConveyorBay(stub, JSON.parse(bay));
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
    public async conveyorItemIntoConveyorBay(stub: Stub, itemStr: string) {
        this.logger.info('########### conveyorItemIntoConveyorBay ###########');
        if (!itemStr) {
            throw new Error('conveyorItemIntoConveyorBay - ERROR No input Item');
        }
        await this.doConveyorItemAssignTo(stub, JSON.parse(itemStr), ConveyorItem.State.inBay);
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
    public async conveyorItemOutConveyorBay(stub: Stub, itemStr: string) {
        this.logger.info('########### conveyorItemOutConveyorBay ###########');
        if (!itemStr) {
            throw new Error('conveyorItemOutConveyorBay - ERROR No  input Item');
        }
        await this.doConveyorItemAssignTo(stub, JSON.parse(itemStr), ConveyorItem.State.released);
    }

    /* methods GET */
    /* getItemsByBay() */
    /* The getItemsByBay method is called to GET a subset of "Map" with all items assigned at this Bay */
    /**
     * Handle custom method execution
     *
     * @param stub
     */
    public async getItemsByBay(stub: Stub, bayId: string) {
        this.logger.info('########### getItemsByBay ###########');
        let itemsAssigned = Array<ConveyorItem>();
        if (bayId == null || bayId == '') {
            throw new Error('getItemsByBay - ERROR No  input Bay');
        }
        let iterator = await stub.getStateByPartialCompositeKey('ITEM', []);
        let items = await Transform.iteratorToObjectList(iterator);

        for (let item of items) {
            let elemItem = item as ConveyorItem;
            if (elemItem.conveyorBay.id == bayId && elemItem.state == ConveyorItem.State.inBelt) {
                itemsAssigned.push(elemItem);
            }
        }
        return itemsAssigned;
    }

    /* methods GET */
    /* getBays() */
    /* The getBays method is called to GET all Bays */
    /**
     * Handle custom method execution
     *
     * @param stub
     */

    public async getBays(stub: Stub) {
        this.logger.info('########### getBays ###########');
        let iterator = await stub.getStateByPartialCompositeKey('BAY', []);
        let bays = await Transform.iteratorToObjectList(iterator);

        return bays;
    }

    public async getItemsById(stub: Stub, id: string) {
        this.logger.info("########### getItemsById ###########");
        if (id == null || id == '') {
            this.logger.error("getItemsById ERROR: id is empty or null!");
            return null;
        }
        return await stub.getState(id);
    }

    public async getItemsByDescription(stub: Stub, desc: string) {
        this.logger.info("########### getItemsByDescription ###########");
        let arrayItem = Array<ConveyorItem>();
        if (desc == null || desc == '') {
            this.logger.error(
                "getItemsByDescription ERROR: desc is empty or null!"
            );
            return null;
        }
        let iterator = await stub.getStateByPartialCompositeKey("ITEM", []);
        let items = await Transform.iteratorToObjectList(iterator);
        for (let item of items) {
            let conveyorItem = item as ConveyorItem;
            if (conveyorItem.type.description == desc)
                arrayItem.push(conveyorItem);
        }
        return arrayItem;
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
        /* INIT 5 types initial (Oven, Fridge, WashingMachine, Dishwasher, Dryer) */

        let typeOven = new ConveyorItemType('869990965260', 'oven');
        let typeFridge = new ConveyorItemType('869990965261', 'fridge');
        let typeWashingMachine = new ConveyorItemType('869990965262', 'washingmachine');
        let typeDishwasher = new ConveyorItemType('869990965263', 'dishwasher');
        let typeDryer = new ConveyorItemType('869990965264', 'dryer');

        try {
            await stub.putState(typeOven.id, Buffer.from(JSON.stringify(typeOven)));
            await stub.putState(typeFridge.id, Buffer.from(JSON.stringify(typeFridge)));
            await stub.putState(typeWashingMachine.id, Buffer.from(JSON.stringify(typeWashingMachine)));
            await stub.putState(typeDishwasher.id, Buffer.from(JSON.stringify(typeDishwasher)));
            await stub.putState(typeDryer.id, Buffer.from(JSON.stringify(typeDryer)));
        } catch (e) {
            this.logger.error(`INIT - ERROR: Something wrong in put State of types ` + e);
            throw new Error(e);
        }

        /* INIT 10 bays initial (with precerence) */
        // @FIXME Use Loop for repetitive tasks
        let bayOne = new ConveyorBay('1', 10, 5, true, 1, new Date());
        bayOne.addPreference(typeOven);
        bayOne.addPreference(typeFridge);

        let bayTwo = new ConveyorBay('2', 20, 0, true, 2, new Date());
        bayTwo.addPreference(typeWashingMachine);
        bayTwo.addPreference(typeDishwasher);
        bayTwo.addPreference(typeDryer);

        let bayThree = new ConveyorBay('3', 30, 0, true, 3, new Date());
        bayThree.addPreference(typeWashingMachine);
        bayThree.addPreference(typeDishwasher);
        bayThree.addPreference(typeDryer);
        bayThree.addPreference(typeOven);
        bayThree.addPreference(typeFridge);

        let bayFor = new ConveyorBay('4', 40, 0, true, 4, new Date());
        bayThree.addPreference(typeWashingMachine);
        bayThree.addPreference(typeDryer);
        bayThree.addPreference(typeFridge);

        let bayFive = new ConveyorBay('5', 50, 0, true, 5, new Date());
        bayThree.addPreference(typeDishwasher);
        bayThree.addPreference(typeDryer);
        bayThree.addPreference(typeOven);

        let baySix = new ConveyorBay('6', 60, 0, true, 6, new Date());
        bayThree.addPreference(typeWashingMachine);
        bayThree.addPreference(typeFridge);

        let baySeven = new ConveyorBay('7', 70, 0, true, 7, new Date());
        bayThree.addPreference(typeWashingMachine);
        bayThree.addPreference(typeDishwasher);
        bayThree.addPreference(typeDryer);
        bayThree.addPreference(typeOven);
        bayThree.addPreference(typeFridge);

        let bayEight = new ConveyorBay('8', 80, 0, true, 8, new Date());
        bayThree.addPreference(typeWashingMachine);
        bayThree.addPreference(typeDishwasher);
        bayThree.addPreference(typeDryer);
        bayThree.addPreference(typeOven);
        bayThree.addPreference(typeFridge);

        let bayNine = new ConveyorBay('9', 90, 0, true, 9, new Date());
        bayThree.addPreference(typeWashingMachine);
        bayThree.addPreference(typeDishwasher);
        bayThree.addPreference(typeDryer);
        bayThree.addPreference(typeOven);
        bayThree.addPreference(typeFridge);

        let bayTen = new ConveyorBay('10', 99, 0, true, 10, new Date());
        bayThree.addPreference(typeWashingMachine);
        bayThree.addPreference(typeDishwasher);
        bayThree.addPreference(typeDryer);
        bayThree.addPreference(typeOven);
        bayThree.addPreference(typeFridge);
        try {
            await this.doEditConveyorBay(stub, bayOne);
            await this.doEditConveyorBay(stub, bayTwo);
            await this.doEditConveyorBay(stub, bayThree);
            await this.doEditConveyorBay(stub, bayFor);
            await this.doEditConveyorBay(stub, bayFive);
            await this.doEditConveyorBay(stub, baySix);
            await this.doEditConveyorBay(stub, baySeven);
            await this.doEditConveyorBay(stub, bayEight);
            await this.doEditConveyorBay(stub, bayNine);
            await this.doEditConveyorBay(stub, bayTen);
        } catch (e) {
            this.logger.error(`INIT - ERROR: Something wrong in addPreference of bay ` + e);
            throw new Error(e);
        }
        // @FIXME Use Loop for repetitive tasks
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
        this.logger.info('################ ATTENTION #########################');
        this.logger.info('########### controlBays  NOT IN FUNCTION ###########');
        this.logger.info('####################################################');
        /*
        let iterator = await stub.getStateByPartialCompositeKey('BAY', []);
        let bays = await Transform.iteratorToObjectList(iterator);
        let displayDate: Date = new Date();
        let mill = displayDate.getTime();
        mill = mill - 15000;
        // let num = displayDate.setSeconds(displayDate.getSeconds() - 15);

        for (let bay of bays) {
            let baia = bay as ConveyorBay;
            // this.logger.info('CONTROL ConveyorBay with id: ' + baia.id);
            let bayDate = new Date(baia.datetime).getTime();
            if (bayDate < mill) {
                this.logger.info('ConveyorBay with id: ' + baia.id + ' switched OFF due to inactivity ');
                baia.enable = false;
                this.doEditConveyorBay(stub, baia);

                let items = new Array<ConveyorItem>();
                items = await this.getItemsByBay(stub, baia.id);
                for (let item of items) {
                    this.assignBayToItem(stub, item);
                }
            }
        }
        
        return shim.success();

        */

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
                    //if (baia.preference.includes(item.type)) {
                    let isFound = false;
                    for (let pref of baia.preference) {
                        if (pref.id === item.type.id) {
                            baysCompatible.push(baia);
                            isFound = true;
                            break;
                        }
                    }
                    if (!isFound) {
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
                this.logger.error(`assignBayToItem - ERROR: NO Bays available for Item` + item.id);
                return shim.error(`assignBayToItem - ERROR: NO Bays available for Item` + item.id);
            }
        }
        item.conveyorBay = baySelected;
        return this.doConveyorItemAssignTo(stub, item, ConveyorItem.State.inBelt);
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

    private async doEditConveyorBay(stub: Stub, bay: ConveyorBay) {
        this.logger.info('########### doEditConveyorBay ###########');
        if (bay == null) {
            return shim.error(`doEditConveyorBay - ERROR: NO Bay in Input`);
        }

        try {
            let keyBay = await this.generateKey(stub, 'BAY', bay.id);
            return await stub.putState(keyBay, Buffer.from(JSON.stringify(bay)));
        } catch (e) {
            this.logger.error(`doEditConveyorBay - ERROR: Something wrong in put State of bay ` + e);
            this.logger.error(`doEditConveyorBay - BAY id: ${bay.id}`);
            throw new Error(e);
        }
    }


    private async doConveyorItemAssignTo(stub: Stub, item: ConveyorItem, state: ConveyorItem.State) {
        this.logger.info('########### doConveyorItemAssignTo ###########');

        /* Control all bays on - off */
        await this.controlBays(stub);

        this.logger.info('doConveyorItemAssignTo - state                   : ' + state);
        this.logger.info('doConveyorItemAssignTo - ConveyorItem.State.inBay: ' + ConveyorItem.State.inBay);
        this.logger.info('doConveyorItemAssignTo - item.conveyorBay.id  : ' + item.conveyorBay.id);
        if (state == ConveyorItem.State.inBay) {
            this.logger.info('doConveyorItemAssignTo - load ++              : ' + item.conveyorBay.load);
            //item.conveyorBay.load++;
            let carico = item.conveyorBay.load;
            carico = carico + 1;
            item.conveyorBay.load = carico;
        }
        if (state == ConveyorItem.State.released) {
            this.logger.info('doConveyorItemAssignTo - load --              : ' + item.conveyorBay.load);
            // item.conveyorBay.load--;
            let carico = item.conveyorBay.load;
            carico = carico - 1;
            item.conveyorBay.load = carico;
        }

        item.state = state;
        this.logger.info('doConveyorItemAssignTo - item.state               : ' + item.state);

        try {
            let keyItem = await this.generateKey(stub, 'ITEM', item.id);
            await stub.putState(keyItem, Buffer.from(JSON.stringify(item)));
            this.logger.info('doConveyorItemAssignTo - post stub.putState   : ' + keyItem);

        } catch (e) {
            this.logger.error(`doConveyorItemAssignTo - ERROR: Something wrong in put State of item ` + e);
            return shim.error(e);
        }

        try {
            let bay = item.conveyorBay;
            this.logger.info('doConveyorItemAssignTo - pre doEditConveyorBay : ' + bay.id);
            await this.doEditConveyorBay(stub, bay);
        } catch (e) {
            this.logger.error(`doConveyorItemAssignTo - ERROR: Something wrong in put State of bay ` + e);
            return shim.error(e);
        }
        // NEW EVENT @FIXME: Understand if use await keyword @SEE Massi

        this.logger.info('doConveyorItemAssignTo - pre createEvent(item) : ' + item.id);
        const event: EventPayload = this.createEvent(item);
        this.logger.info('doConveyorItemAssignTo - post createEvent(item): ' + item.id);
        stub.setEvent('EVENT', Buffer.from(JSON.stringify(event)));
        this.logger.info('doConveyorItemAssignTo - post setEvent         : ');
    }


    private async  generateKey(stub: Stub, type: string, id: string) {
        this.logger.info('########### generateKey ###########');
        return stub.createCompositeKey(type, [id]);
    }

    private createEvent(item: ConveyorItem) {
        this.logger.info('########### createEvent ###########');
        let event = {
            serialNumberItem: item.id,
            itemType: JSON.stringify(item.type),
            state: item.state,
            bayId: item.conveyorBay.id,
            bayCapacity: item.conveyorBay.capacity,
            bayLoad: item.conveyorBay.load
        };
        return event;
    }


}