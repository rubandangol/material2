import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {Component, ViewChild} from '@angular/core';

import {CollectionViewer, DataSource} from '@angular/cdk/collections';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {combineLatest} from 'rxjs/observable/combineLatest';
import {map} from 'rxjs/operators';

import {TreeControl} from './control/tree-control';
import {FlatTreeControl} from './control/flat-tree-control';
import {CdkTreeModule} from './index';
import {CdkTree} from './tree';


describe('CdkTree', () => {
  let fixture: ComponentFixture<SimpleCdkTreeApp>;

  let component: SimpleCdkTreeApp;
  let dataSource: FakeDataSource;
  let tree: CdkTree<any>;
  let treeElement: HTMLElement;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [CdkTreeModule],
      declarations: [
        SimpleCdkTreeApp,
        // TODO(tinayuangao): Add more test cases with the cdk-tree
        //   DynamicDataSourceCdkTreeApp,
        //   NodeContextCdkTreeApp,
        //   WhenNodeCdkTreeApp
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SimpleCdkTreeApp);

    component = fixture.componentInstance;
    dataSource = component.dataSource as FakeDataSource;
    tree = component.tree;
    treeElement = fixture.nativeElement.querySelector('cdk-tree');

    fixture.detectChanges();
  });

  describe('should initialize', () => {
    it('with a connected data source', () => {
      expect(tree.dataSource).toBe(dataSource);
      expect(dataSource.isConnected).toBe(true);
    });

    it('with rendered dataNodes', () => {
      const nodes = getNodes(treeElement);

      expect(nodes).not.toBe(undefined);
      expect(nodes[0].classList).toContain('customNodeClass');
    });

    it('with the right accessibility roles', () => {
      expect(treeElement.getAttribute('role')).toBe('tree');

      getNodes(treeElement).forEach(node => {
        expect(node.getAttribute('role')).toBe('treeitem');
      });
    });

    it('with the right data', () => {
      expect(dataSource.data.length).toBe(3);

      let data = dataSource.data;
      expectFlatTreeToMatchContent(treeElement,
          [
            `${data[0].pizzaTopping} - ${data[0].pizzaCheese} + ${data[0].pizzaBase}`,
            `${data[1].pizzaTopping} - ${data[1].pizzaCheese} + ${data[1].pizzaBase}`,
            `${data[2].pizzaTopping} - ${data[2].pizzaCheese} + ${data[2].pizzaBase}`
          ],
          [1, 1, 1]);

      dataSource.addData(2);
      fixture.detectChanges();

      data = dataSource.data;
      expect(data.length).toBe(4);
      expectFlatTreeToMatchContent(treeElement,
        [
          `${data[0].pizzaTopping} - ${data[0].pizzaCheese} + ${data[0].pizzaBase}`,
          `${data[1].pizzaTopping} - ${data[1].pizzaCheese} + ${data[1].pizzaBase}`,
          `${data[2].pizzaTopping} - ${data[2].pizzaCheese} + ${data[2].pizzaBase}`,
          `${data[3].pizzaTopping} - ${data[3].pizzaCheese} + ${data[3].pizzaBase}`
        ],
        [1, 1, 1, 2]);
    });
  });
});

export class TestData {
  pizzaTopping: string;
  pizzaCheese: string;
  pizzaBase: string;
  level: number;
  children: TestData[];

  constructor(pizzaTopping: string, pizzaCheese: string, pizzaBase: string, level: number = 1) {
    this.pizzaTopping = pizzaTopping;
    this.pizzaCheese = pizzaCheese;
    this.pizzaBase = pizzaBase;
    this.level = level;
    this.children = [];
  }
}

class FakeDataSource extends DataSource<TestData> {
  isConnected = false;

  _dataChange = new BehaviorSubject<TestData[]>([]);
  set data(data: TestData[]) { this._dataChange.next(data); }
  get data() { return this._dataChange.getValue(); }

  constructor() {
    super();
    for (let i = 0; i < 3; i++) {
      this.addData();
    }
  }

  connect(collectionViewer: CollectionViewer): Observable<TestData[]> {
    this.isConnected = true;
    const streams = [this._dataChange, collectionViewer.viewChange];
    return map.call(combineLatest(streams), ([data]) => data);
  }

  disconnect() {
    this.isConnected = false;
  }

  addData(level: number = 1) {
    const nextIndex = this.data.length + 1;

    let copiedData = this.data.slice();
    copiedData.push(
        new TestData(`topping_${nextIndex}`, `cheese_${nextIndex}`, `base_${nextIndex}`, level));

    this.data = copiedData;
  }
}

@Component({
  template: `
    <cdk-tree [dataSource]="dataSource" [treeControl]="treeControl">
      <cdk-tree-node *cdkTreeNodeDef="let node" class="customNodeClass"
                     cdkTreeNodePadding [cdkTreeNodePaddingIndent]="28">
                     {{node.pizzaTopping}} - {{node.pizzaCheese}} + {{node.pizzaBase}}
      </cdk-tree-node>
    </cdk-tree>
  `
})
class SimpleCdkTreeApp {
  getLevel = (node: TestData) => node.level;
  isExpandable = (node: TestData) => node.children.length > 0;

  dataSource: FakeDataSource | null = new FakeDataSource();
  treeControl: TreeControl<TestData> = new FlatTreeControl(this.getLevel, this.isExpandable);

  @ViewChild(CdkTree) tree: CdkTree<TestData>;
}

function getNodes(treeElement: Element): Element[] {
  return [].slice.call(treeElement.querySelectorAll('.cdk-tree-node'))!;
}

// TODO(tinayuangao): Add expectedNestedTreeToMatchContent
function expectFlatTreeToMatchContent(treeElement: Element, expectedTreeContent: any[],
                                      expectedLevels: number[]) {
  const paddingIndent = 28;
  const missedExpectations: string[] = [];
  function checkNodeContent(node: Element, expectedTextContent: string) {
    const actualTextContent = node.textContent!.trim();
    if (actualTextContent !== expectedTextContent) {
      missedExpectations.push(
        `Expected node contents to be ${expectedTextContent} but was ${actualTextContent}`);
    }
  }

  getNodes(treeElement).forEach((node, index) => {
    const expected = expectedTreeContent ?
      expectedTreeContent[index] :
      null;
    checkNodeContent(node, expected);
    const actualLevel = (node as HTMLElement).style.paddingLeft;
    const expectedLevel = `${expectedLevels[index] * paddingIndent}px`;
    if (actualLevel != expectedLevel) {
      missedExpectations.push(
        `Expected node level to be ${expectedLevel} but was ${actualLevel}`);
    }
  });

  if (missedExpectations.length) {
    fail(missedExpectations.join('\n'));
  }
}
