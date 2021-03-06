import {
  Component, OnInit, ViewChild, ElementRef, HostListener, ViewChildren,
  QueryList, AfterViewInit, ChangeDetectorRef, AfterContentChecked, ViewContainerRef
} from '@angular/core';

import { NotifierService } from 'angular-notifier';

import { SaleComponent } from '../sale/sale.component';
import { Cart } from '../../Shared/interfaces/cart';
import { Product } from '../../Shared/interfaces/product';
import { ProductService } from '../../ProductModule/services/product.service';
import { CartService } from '../services/cart.service';
import { Record } from '../../Shared/interfaces/record';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss']
})
export class SalesComponent implements OnInit, AfterViewInit, AfterContentChecked {


  @ViewChild('sidetotal', { static: true }) total: ElementRef;
  @ViewChild('container', { static: true }) container: ElementRef;
  @ViewChildren(SaleComponent) sales: QueryList<SaleComponent>;

  // Products from server
  products: Product[] = [];

  // Styling properties for the component
  menuPosition: number;
  sticky = false;
  date: Date;

  private isNearBottom = true;

  private scrollContainer: any;

  show = false;

  // Grand Total
  grandTotal = 0.00;

  invalid = true;

  cartDetails: Cart[] = [];

  cart: number[] = [];
  numbers = 1;

  // Event Listener for Styling
  @HostListener('window:scroll', ['$event'])
  handleScroll() {
    const windowScroll = window.pageYOffset;
    this.isNearBottom = this.isUserNearBottom();

    const container = this.container.nativeElement.getBoundingClientRect().height;
    const scrollPos = window.scrollY;
    const winHeight = window.innerHeight;

    if ((container > winHeight) && (scrollPos > 300)) {
      this.show = true;
    } else {
      this.show = false;
    }

    if (windowScroll >= this.menuPosition) {
      this.sticky = true;
    } else {
      this.sticky = false;
    }
  }

  constructor(private product: ProductService, private cdr: ChangeDetectorRef, private cartService: CartService,
              private notifier: NotifierService, private viewContainerRef: ViewContainerRef) { }

  ngOnInit(): void {

    // const a: ElementRef = this.viewContainerRef;

    // console.log(this.viewContainerRef);

    // Gettin Current Date
    this.date = new Date();

    // Initializing a new cart component
    this.cart.push(this.numbers);

    // Getting the position for styling
    this.menuPosition = this.total.nativeElement.getBoundingClientRect().top;

    // API Call for Products
    this.getData();

  }

  ngAfterViewInit(): void {

    this.scrollContainer = this.container.nativeElement;

    // Listening for changes in the sale component
    this.sales.changes.subscribe(
      (changes) => {
        this.onItemElementsChanged();
      }
    );

    this.cartService.addToCart.subscribe(
      (val) => {

        const item = this.cartDetails.find((value) => value.index === val.index);

        if (item === undefined) {
          this.cartDetails.push(val);
        } else {
          const index = this.cartDetails.indexOf(item);
          this.cartDetails.splice(index, 1, val);
        }
        const zero = this.cartDetails.find((val) => {
          return val.product.quantity === 0;
        });

        if (zero === undefined) {
          this.invalid = false;
        } else {
          this.invalid = true;
        }

        this.sumTotal();
      }
    );
    this.cartService.deleteCart.subscribe(
      (a) => {
        this.deleteSale(a);
        this.sumTotal();
      }
    );
  }

  ngAfterContentChecked(): void {
    this.cdr.detectChanges();
  }

  getData(): void {
    this.product.getAllProducts().subscribe(
      (result) => {
        this.products = result;
      },
      (error) => {
        this.notifier.notify('error', error.message);
      }
    );
  }

  private onItemElementsChanged(): void {
    if (this.isNearBottom) {
      this.scrollToBottom();
    }
  }

  addSale() {
    this.numbers++;
    this.cart.push(this.numbers);
  }

  sumTotal(): void {
    if (!this.cartDetails.length) {
      this.grandTotal = 0.00;
    } else {
      this.grandTotal = this.cartDetails.reduce(((total, item) => item.total + total), 0);
    }
  }

  deleteSale(index: number): void {
    this.cartDetails.splice(index, 1);
    this.cart.splice(index, 1);
    this.sumTotal();
  }

  sell(): void {

    const detail = [];
    const array: any = this.cartDetails;

    for (const item of array) {
      const newData: any = new Object();
      newData.id = item.product.id;
      newData.name = item.product.name;
      newData.price = item.product.price;
      newData.quantity = item.quantity;
      newData.discount = item.discount === null ? 0 : item.discount;
      newData.total = item.total;
      detail.push(newData);
    }

    const data: Record = {
      details: detail,
      total: this.grandTotal
    }

    this.product.saveSale(data).subscribe(
      (result) => {
        this.cartDetails = [];
        this.numbers = 1;
        this.cart = [];
        this.sumTotal();
        this.getData();
        this.showSuccessNotification('Sold');
        this.cart.length = 0;
        setTimeout(() => {
          this.cart.length = 1;
        }, 1);
      },
      (error) => {
        this.showErrorNotification(error.message);
      }
    );
  }

  private scrollToBottom(): void {
    window.scroll({
      top: this.scrollContainer.scrollHeight,
      left: 0,
      behavior: 'smooth'
    });
  }

  scrollTop(): void{
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  private isUserNearBottom(): boolean {
    const threshold = 150;
    const position = window.scrollY + window.innerHeight;
    const height = document.body.scrollHeight;
    return position > height - threshold;
  }

  public showSuccessNotification(message: string): void {
    this.notifier.notify('success', message);
  }

  public showErrorNotification(message: string): void {
    this.notifier.notify('error', message);
  }


}
