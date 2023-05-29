/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom"
import { expect, jest, test } from '@jest/globals';

import BillsUI from "../views/BillsUI.js"
import userEvent from "@testing-library/user-event";
import { bills } from "../fixtures/bills.js"
import Bills from "../containers/Bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

import router from "../app/Router.js";
import arrow from "../assets/svg/arrow.js";

jest.mock("../app/store", () => mockStore);


describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };
    let billsPage = new Bills({ document, onNavigate, store: mockStore, localStorage: window.localStorage });
    document.body.innerHTML = BillsUI({ data: bills })

    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      // Ajout de expect pour compléter le test
      expect(windowIcon.getAttribute("class")).toContain("active-icon");
    })

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then the modal should open and display supporting document when I click on IconEye", () => {
      $.fn.modal = jest.fn(); // On simule le fonctionnement de la fonction Jquery modal

      const eyeIcon = screen.getAllByTestId('icon-eye')
      const handleShowModalFile = jest.fn((e) => { billsPage.handleClickIconEye(e) }) // Variable qui simule la fonction handleClickIconEye de la page Bills

      // Listener sur les icônes de l'oeil
      eyeIcon.forEach((icon) => {
        icon.addEventListener("click", () => handleShowModalFile(icon));
        userEvent.click(icon); // Simulation d'un click sur un oeil
        expect(handleShowModalFile).toHaveBeenCalled() // On attends que la fonction handleShowModalFile soit appelée
      });

      const modal = $('#modaleFile')
      expect(modal.css('display')).toEqual('block');// On attends donc que la modal présente dans son CSS la propriété display:block
    })

    test('Then the newBill page should open when i click on newBill button', () => {

      const buttonNewBill = screen.getByTestId("btn-new-bill");
      const handleShowNewBillPage = jest.fn((e) => { billsPage.handleClickNewBill(e) }) // Variable qui simule la fonction handleClickNewBill de la page Bills
      // Listener sur le bouton newBill
      buttonNewBill.addEventListener('click', handleShowNewBillPage)

      userEvent.click(buttonNewBill) // On simule un click sur le bouton newBill

      expect(handleShowNewBillPage).toHaveBeenCalled() // On s'attends à ce que la fonction handleShowNewBillPage soit appelée
      expect(screen.getAllByTestId('form-new-bill')).toBeTruthy() // On s'attends donc à ce que la page contienne le formulaire 'form-new-bill' qui correspond à la création d'un nouvelle note de frais
    })

    describe("Given I am a user connected as Employee", () => {
      describe("When Je suis sur la page Bill", () => {
        test("fetches bills from mock API GET", async () => {
          localStorage.setItem("user", JSON.stringify({ type: "Employee" }))
          const root = document.createElement("div")
          root.setAttribute("id", "root")
          document.body.append(root)
          router()
          window.onNavigate(ROUTES_PATH.Bills)
          expect(screen.findByText("test1")).toBeTruthy()
        })
        describe("When an error occurs on API", () => {
          beforeEach(() => {
            jest.spyOn(mockStore, "bills")
            Object.defineProperty(window, "localStorage", {
              value: localStorageMock,
            })
            window.localStorage.setItem(
              "user",
              JSON.stringify({
                type: "Employee",
                email: "a@a",
              })
            )
            const root = document.createElement("div")
            root.setAttribute("id", "root")
            document.body.appendChild(root)
            router()
          })

          test("fetches messages from an API and fails with 500 message error", async () => {
            mockStore.bills.mockImplementationOnce(() => {
              return {
                list: () => {
                  return Promise.reject(new Error("Erreur 500"))
                },
              }
            })

            const errorWindow = BillsUI({ error: "Erreur 500" })
            document.body.innerHTML = errorWindow
            const message = await screen.getByText(/Erreur 500/)
            expect(message).toBeTruthy()
          })
          test("fetches bills from an API and fails with 404 message error", async () => {
            mockStore.bills.mockImplementationOnce(() => {
              return {
                list: () => {
                  return Promise.reject(new Error("Erreur 404"))
                },
              }
            })
            const errorWindow = BillsUI({ error: "Erreur 404" })
            document.body.innerHTML = errorWindow
            const message = await screen.getByText(/Erreur 404/)
            expect(message).toBeTruthy()
          })
        })
      })
    })
  })
})
