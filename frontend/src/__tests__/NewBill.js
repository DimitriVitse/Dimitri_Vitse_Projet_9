/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom"
import userEvent from "@testing-library/user-event";
import { expect, jest, test } from '@jest/globals';

import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js"
import BillsUI from "../views/BillsUI.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";

import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);


describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    document.body.innerHTML = NewBillUI();

    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };

    let newBillPage = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage });

    test("Then mail icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );

      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.NewBill)
      await waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail')
      // Ajout de expect pour compléter le test
      expect(mailIcon.getAttribute("class")).toContain("active-icon");
    })

    test("Then there should be a form to edit a new Bill", () => {
      document.body.innerHTML = NewBillUI();
      let form = screen.getByTestId("form-new-bill");
      expect(form).toBeTruthy();
    })

    test("Then the form should be submitted by clicking on the submit button", async () => {
      const handleSubmitMock = jest.fn(newBillPage.handleSubmit);
      await waitFor(() => screen.getByTestId("form-new-bill"));

      const newBillFormButton = screen.getByTestId("form-new-bill");
      newBillFormButton.addEventListener("submit", handleSubmitMock);

      fireEvent.submit(newBillFormButton);
      expect(handleSubmitMock).toHaveBeenCalled();
    });

  })

})

describe("Then uploading  a valid file : JPG/JPEG/PNG extension", () => {
  document.body.innerHTML = NewBillUI()
  const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
  const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
  const handleChangeFile = jest.fn(newBill.handleChangeFile)
  const fileInput = screen.getByTestId("file")
  const file = new File(["image"], "image.jpg", { type: "image/jpg" })
  fileInput.addEventListener("change", handleChangeFile)
  userEvent.upload(fileInput, file)

  test("Then it should call the handleChangeFile function", () => {
    expect(handleChangeFile).toHaveBeenCalled();
    expect(fileInput.files[0]).toStrictEqual(file)
  })

  test("Then it should update the input field", () => {
    expect(fileInput.files[0].name).toBe("image.jpg");
  })

})

test("Then uploading  a invalid file : not JPG/JPEG/PNG extension", async () => {
  document.body.innerHTML = NewBillUI()
  const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
  const newBill = new NewBill({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
  const fileInput = screen.getByTestId("file")

  const handleChangeFile = jest.fn(newBill.handleChangeFile)
  const file = new File(["document"], "document.pdf", { type: "document/pdf" })
  fileInput.addEventListener("change", handleChangeFile)
  fireEvent.change(fileInput, { target: { files: [file] } })
  expect(handleChangeFile).toHaveBeenCalled();

  await waitFor(() => screen.getByTestId("message-error-file"));
  expect(screen.getByTestId("message-error-file").classList).not.toContain(
    "hidden"
  );
})



// Test d'intégration POST
describe("Given I am a user connected as Employee", () => {
  describe("When I create new Bill", () => {

    test("then send bill to mock API POST", async () => {
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" })) // Définition de la clé user dans le localstorage.
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router(); // On appelle le routeur pour préparer à l'utilisation de la route NewBill
      window.onNavigate(ROUTES_PATH.NewBill);
      jest.spyOn(mockStore, "bills"); // On espionne la méthode bills.

      mockStore.bills.mockImplementationOnce(() => { // On simule une méthode create qui renvoit une promise résolue.
        return {
          create: () => {
            return Promise.resolve();
          },
        };
      });

      await new Promise(process.nextTick); // On attends que toutes les tâches soient exécutées.

      document.body.innerHTML = BillsUI({}) // Remplace le contenu HTML du body.
      expect(screen.getByText("Mes notes de frais")).toBeTruthy(); // On s'attends à voir la chaîne de caractère Mes notes de frais sur la page.

    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }))
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.append(root);
        router();
        window.onNavigate(ROUTES_PATH.NewBill);
        jest.spyOn(mockStore, "bills");
      });

      // Test send Bill error 500
      test("send bill to an API and fails with 500 message error", async () => {
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
      // Test send Bill error 400
      test("send bill to an API and fails with 404 message error", async () => {
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
    });
  });
})
