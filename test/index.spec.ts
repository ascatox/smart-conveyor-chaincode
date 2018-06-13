/* tslint:disable */

import { ChaincodeMockStub } from '@theledger/fabric-mock-stub';
import { ChaincodeReponse } from 'fabric-shim';
import { Transform } from '../src/utils/datatransform';
import * as mocha from 'mocha';
import { expect } from 'chai';
import { SmartConveyorChaincode } from '../src';
import { ConveyorItem } from '../src/ConveyorItem';
import { ConveyorBay } from '../src/ConveyorBay';

const chaincode = new SmartConveyorChaincode();

describe('Test Mockstub', () => {
    it('Should be able to init', async () => {

        const stub = new ChaincodeMockStub('mock', chaincode);
        const args = ['arg1', 'arg2'];
        const response: ChaincodeReponse = await stub.mockInit('uudif', args);
        expect(response.status).to.deep.equal(200);
    });
    it('Should be able to control bays', async () => {
        const stub = new ChaincodeMockStub('mock', chaincode);
        const args = ['arg1', 'arg2'];
        await stub.mockInit('test', args);

        const response: ChaincodeReponse = await stub.mockInvoke('test', ['controlBays']);
        expect(response.status).to.deep.equal(200);
    });
    it('Should be able to store conveyor item', async () => {
        const stub = new ChaincodeMockStub('mock', chaincode);
        const args = ['arg1', 'arg2'];
        await stub.mockInit('test', args);

    //    let typeOven = new ConveyorItemType('1', 'Oven');
    //    let typeFridge = new ConveyorItemType('2', 'Fridge');
    //    let typeWashingMachine = new ConveyorItemType('3', 'WashingMachine');
    //    let typeDishwasher = new ConveyorItemType('4', 'Dishwasher');
    //    let typedryer = new ConveyorItemType('5', 'Dryer');

    //    const conveyorBay: ConveyorBay = new ConveyorBay('1', 10, 0, true, 1, new Date());
        const item: ConveyorItem = {
            typeObject: 'ITEM',
            id: '7784199',
            type: {
                id: '1',
                description: 'Oven'
            },
            conveyorBay: null,
            state: null
        };
        const response: ChaincodeReponse = await stub.mockInvoke('test', ['storeConveyorItem', JSON.stringify(item)]);
        expect(response.status).to.deep.equal(200);
    });
    it('Should be able to edit conveyor bay', async () => {
        const stub = new ChaincodeMockStub('mock', chaincode);
        const args = ['arg1', 'arg2'];
        await stub.mockInit('test', args);

        const bay: ConveyorBay = new ConveyorBay('1', 10, 0, true, 1, new Date());
      
        const response: ChaincodeReponse = await stub.mockInvoke('test', ['editConveyorBay', JSON.stringify(bay)]);
        expect(response.status).to.deep.equal(200);
    });
});
