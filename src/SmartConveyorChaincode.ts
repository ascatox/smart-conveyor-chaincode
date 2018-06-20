import shim = require('fabric-shim');
import { ChaincodeInterface, ChaincodeReponse, Stub } from 'fabric-shim';
import { ERRORS } from './constants/errors';
import { ChaincodeError } from './ChaincodeError';
import { StubHelper } from './StubHelper';
import { Transform } from './utils/datatransform';
import { ConveyorBay } from './ConveyorBay';
import { ConveyorItemType } from '.';
import { ConveyorItem } from './ConveyorItem';
import { EventPayload } from './EventPayload';

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
        try {
            const item: ConveyorItem = JSON.parse(itemStr);
            /* Control all bays on - off */
            // await this.controlBays(stub);
            await this.assignBayToItem(stub, item);
        } catch (err) {
            throw new Error(err);
        }
    }

    /* methods POST */
    /* EditConveyorBay() */
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
        try {
            await this.doEditConveyorBay(stub, JSON.parse(bay));
        } catch (err) {
            throw new Error(err);
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
    public async conveyorItemIntoConveyorBay(stub: Stub, itemStr: string) {
        this.logger.info('########### conveyorItemIntoConveyorBay ###########');
        if (!itemStr) {
            throw new Error('conveyorItemIntoConveyorBay - ERROR No input Item');
        }
        try {
            await this.doConveyorItemAssignTo(stub, JSON.parse(itemStr), ConveyorItem.State.inBay);
        } catch (err) {
            throw new Error(err);
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
    public async conveyorItemOutConveyorBay(stub: Stub, itemStr: string) {
        this.logger.info('########### conveyorItemOutConveyorBay ###########');
        if (!itemStr) {
            throw new Error('conveyorItemOutConveyorBay - ERROR No  input Item');
        }
        try {
            await this.doConveyorItemAssignTo(stub, JSON.parse(itemStr), ConveyorItem.State.released);
        } catch (err) {
            throw new Error(err);
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
    public async getItemsByBay(stub: Stub, bayId: string) {
        this.logger.info('########### getItemsByBay ###########');
        if (bayId == null || bayId == '') {
            throw new Error('getItemsByBay - ERROR No  input Bay');
        }
        try {
            return this.doGetItemsByBayByState(stub, bayId, ConveyorItem.State.inBelt);
        } catch (err) {
            throw new Error(err);
        }
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
        try {
            let iterator = await stub.getStateByPartialCompositeKey('BAY', []);
            let bays = await Transform.iteratorToObjectList(iterator);
            return bays;
        } catch (err) {
            throw new Error(err);
        }
    }

    public async getItemsById(stub: Stub, id: string) {
        this.logger.info("########### getItemsById ###########");
        if (id == null || id == '') {
            this.logger.error("getItemsById ERROR: id is empty or null!");
            throw new Error('getItemsById ERROR: id is empty or null!');
        }
        try {
            let keyItem: string = await this.generateKey(stub, "ITEM", id);
            let item = await stub.getState(keyItem);
            return item;
        } catch (e) {
            this.logger.error(
                "getItemsById ERROR: Item not found with this id: " + id
            );
            return new Error(e);
        }
    }

    public async getItemsByDescription(stub: Stub, desc: string) {
        let arrayItem = Array<ConveyorItem>();
        this.logger.info('########### getItemsByDescription ###########');
        if (desc == null || desc == "") {
            this.logger.error('getItemsByDescription ERROR: desc is empty or null!');
            return new Error('getItemsByDescription ERROR: desc is empty or null!');
        }
        try {
            let iterator = await stub.getStateByPartialCompositeKey("ITEM", []);
            let items = await Transform.iteratorToObjectList(iterator);
            for (let item of items) {
                let conveyorItem = item as ConveyorItem;
                if (conveyorItem.type.description == desc)
                    arrayItem.push(conveyorItem);
            }
            return arrayItem;
        } catch (e) {
            this.logger.error('getItemsByDescription ERROR: Item not found with this desc: ' + desc);
            return new Error(e);
        }
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

        let typeA = new ConveyorItemType('869990965260', '');
        let typeB = new ConveyorItemType('869990965261', '');

        try {
            await stub.putState(typeA.id, Buffer.from(JSON.stringify(typeA)));
            await stub.putState(typeB.id, Buffer.from(JSON.stringify(typeB)));

        } catch (e) {
            this.logger.error(`INIT - ERROR: Something wrong in put State of types ` + e);
            throw new Error('INIT - ERROR: Something wrong in put State of types' + e);
        }

        /* INIT 10 bays initial (with precerence) */
        // @FIXME Use Loop for repetitive tasks
        let bayOne = new ConveyorBay('1', 8, 0, true, 1, new Date());
        bayOne.addPreference(typeA);
        bayOne.addPreference(typeB);

        let bayTwo = new ConveyorBay('2', 8, 0, true, 2, new Date());
        bayTwo.addPreference(typeA);
        bayTwo.addPreference(typeB);

        let bayThree = new ConveyorBay('3', 8, 0, true, 3, new Date());
        bayThree.addPreference(typeA);
        bayThree.addPreference(typeB);

        let bayFor = new ConveyorBay('4', 8, 0, true, 4, new Date());
        bayFor.addPreference(typeB);

        let bayFive = new ConveyorBay('5', 8, 0, true, 5, new Date());
        bayFive.addPreference(typeA);

        let baySix = new ConveyorBay('6', 8, 0, true, 6, new Date());
        baySix.addPreference(typeB);

        let baySeven = new ConveyorBay('7', 8, 0, true, 7, new Date());
        baySeven.addPreference(typeA);

        let bayEight = new ConveyorBay('8', 8, 0, true, 8, new Date());
        bayEight.addPreference(typeA);
        bayEight.addPreference(typeB);

        let bayNine = new ConveyorBay('9', 8, 0, true, 9, new Date());
        bayNine.addPreference(typeA);
        bayNine.addPreference(typeB);

        let bayTen = new ConveyorBay('10', 8, 0, true, 10, new Date());
        bayTen.addPreference(typeA);
        bayTen.addPreference(typeB);
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
            throw new Error('INIT - ERROR: Something wrong in addPreference of bay ' + e);
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

        try {
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
                    await this.doEditConveyorBay(stub, baia);

                    let items = new Array<ConveyorItem>();
                    items = await this.doGetItemsByBayByState(stub, baia.id, ConveyorItem.State.inBelt);
                    for (let item of items) {
                        await this.assignBayToItem(stub, item);
                    }
                }
            }
        } catch (err) {
            throw new Error(err);
        }

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
        try {
            let iterator = await stub.getStateByPartialCompositeKey('BAY', []);
            let bays = await Transform.iteratorToObjectList(iterator);
            let baysCompatible = Array<ConveyorBay>();
            let baysAvailable = Array<ConveyorBay>();

            for (let bay of bays) {
                let baia = bay as ConveyorBay;
                if (baia.enable) {
                    if (baia.capacity > baia.load) {
                        let isFound = false;
                        for (let pref of baia.preference) {
                            if (pref.id === item.type.id) {
                                baysCompatible.push(baia);
                                isFound = true;
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
                    this.logger.error(`assignBayToItem - ERROR: NO Bays available for Item: ` + item.id);
                    this.logger.error(`assignBayToItem - ITEM TYPE : ` + item.type.id);
                    this.logger.error(`assignBayToItem - ITEM STATE: ` + item.state);
                    throw new Error(`assignBayToItem - ERROR: NO Bays available for Item ` + item.id);
                }
            }
            item.conveyorBay = baySelected;
            this.logger.info('assignBayToItem - ITEM IN BELT: ' + item.id + ' BAY DESTINATION ASSIGNED: ' + item.conveyorBay.id);
            
            const ret = await this.doConveyorItemAssignTo(stub, item, ConveyorItem.State.inBelt);
            // NEW EVENT EVENT === Conveyor Belt Situation

            const event: EventPayload = await this.createEvent(stub, item.conveyorBay);
            stub.setEvent('EVENT', Buffer.from(JSON.stringify(event)));
            
            return ret; 
        } catch (err) {
            throw new Error(err);
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

    private async doEditConveyorBay(stub: Stub, bay: ConveyorBay) {
        this.logger.info('########### doEditConveyorBay ###########');
        if (bay == null) {
            throw new Error(`doEditConveyorBay - ERROR: NO Bay in Input`);
        }
        try {
            let keyBay = await this.generateKey(stub, 'BAY', bay.id);

            return await stub.putState(keyBay, Buffer.from(JSON.stringify(bay)));

        } catch (e) {
            this.logger.error(`doEditConveyorBay - ERROR: Something wrong in put State of bay ` + e);
            this.logger.error(`doEditConveyorBay - BAY id: ${bay.id}`);
            throw new Error('doEditConveyorBay - ERROR: Something wrong in put State of bay ' + e);
        }
    }


    private async doConveyorItemAssignTo(stub: Stub, item: ConveyorItem, state: ConveyorItem.State) {
        this.logger.info('########### doConveyorItemAssignTo ###########');

        /* Control all bays on - off */
        //@FIXME await this.controlBays(stub);

        if (state == ConveyorItem.State.inBelt) {
            //item.conveyorBay.load++;
            let carico = item.conveyorBay.load;
            carico = carico + 1;
            item.conveyorBay.load = carico;
        }
        if (state == ConveyorItem.State.inBay) {
            // item.conveyorBay.load--;
            let carico = item.conveyorBay.load;
            carico = carico - 1;
            item.conveyorBay.load = carico;
        }

        item.state = state;

        try {
            let keyItem = await this.generateKey(stub, 'ITEM', item.id);
            await stub.putState(keyItem, Buffer.from(JSON.stringify(item)));

        } catch (e) {
            this.logger.error(`doConveyorItemAssignTo - ERROR: Something wrong in put State of item ` + e);
            throw new Error('doConveyorItemAssignTo - ERROR: Something wrong in put State of item ' + e);
        }

        try {
            let bay = item.conveyorBay;
            await this.doEditConveyorBay(stub, bay);
        } catch (e) {
            this.logger.error(`doConveyorItemAssignTo - ERROR: Something wrong in put State of bay ` + e);
            throw new Error('doConveyorItemAssignTo - ERROR: Something wrong in put State of bay' + e);
        }
    }

    private async  generateKey(stub: Stub, type: string, id: string) {
        // this.logger.info('########### generateKey for ' + id + ' of TYPE ' + type + ' ######');
        return stub.createCompositeKey(type, [id]);
    }


    private async doGetItemsByBayByState(stub: Stub, bayId: string, state: ConveyorItem.State) {
        this.logger.info('########### doGetItemsByBayByState ###########');

        let itemsAssigned = Array<ConveyorItem>();
        let iterator = await stub.getStateByPartialCompositeKey('ITEM', []);
        let items = await Transform.iteratorToObjectList(iterator);

        for (let item of items) {
            let elemItem = item as ConveyorItem;
            if (elemItem.conveyorBay.id == bayId && elemItem.state == state) {
                itemsAssigned.push(elemItem);
            }
        }

        return itemsAssigned;
    }

    private async createEvent(stub: Stub, bay: ConveyorBay) {
        // this.logger.info('########### createEvent ###########');
        let items = Array<ConveyorItem>();
        items = await this.doGetItemsByBayByState(stub, bay.id, ConveyorItem.State.inBelt)

        let itemsReduced = Array<any>();
        for (let item of items) {
            const itm = {
                id: item.id,
                type: item.type.id
            };
            itemsReduced.push(itm);
        };

        let preferencesReduced = Array<any>();
        for (let pref of bay.preference) {
            const prf = {
                id: pref.id
            };
            preferencesReduced.push(prf);
        };

        let carico = (bay.load / bay.capacity) * 100;
        let ena = '';
        if (bay.enable) {
            ena = 'ON';
        } else {
            ena = 'OFF';
        }

        let event = {
            id: bay.id,
            type: bay.typeObject,
            preferences: JSON.stringify(preferencesReduced),
            loadFactor: carico + '',
            items: JSON.stringify(itemsReduced),
            enable: ena
        };
        return event;
    }

}