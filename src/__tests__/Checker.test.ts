import assert from "assert"
import * as fs from "fs"
import * as _ from "lodash"
import { checkAsync, checkForDomain, checkParallel } from "../checker"

describe("emailChecker", () => {
    it("check valid user", (done) => {
        return checkAsync("gutsal.arsen@softsky.com.ua")
            .then((res: any) => {
                assert(res, "checkAsync should return true")
                done()
            })
            .catch((err: any) => done.fail(`Should not be called: ${err}`))
    })

    it("check invalid user", (done) => {
        return checkAsync("gutsal.arsen1@softsky.com.ua")
            .then((res: any) => {
                assert(res === false, "checkAsync should return true")
                done()
            })
            .catch((err: any) => done.fail(`Should not be called: ${err}`))
    })

    it("check invalid domain", (done) => {
        return checkAsync("gutsal.arsen1@softsky.com.ua1")
            .then((a: any) => done.fail(`Should not be called ${a}`))
            .catch(() => {
                done()
            })
    })

    it("parallelCheck: set of different emails", () => {
        jest.setTimeout(300000)
        return checkParallel(
            [
                "slllls@i.ua",
                "s.grinishina@tas-insurance.com.ua",
                "hr@startime.com.ua",
                "liana19@lanet.kiev.ua",
                "seregjka@meta.ua",
                "office@bittele.com.ua",
                "pustoviys@i.ua",
                "tanushkabest@e-mail.ua",
                "alexander@velikiy.org.ua",
                "a.chadaev@stroykomplekt.com.ua",
            ],
            10,
        )
    })

    it("checkForDomain: set of different emails for same domain address", () => {
        jest.setTimeout(30000)
        return checkForDomain({
            "i.ua": [
                "todoruk",
                "dimitriy86",
                "luksor55",
                "ray-lea",
                "yashka444a",
                "atn-55",
                "fruittella",
                "andruha",
                "aligator_xxx",
                "lolita63",
            ],
        })
            .then((results: any) =>
                  results.filter((it: any) => it.status === true),
            )
            .then((statusTrue: any[]) => assert(statusTrue.length === 4))
    })

    it("checkForDomain: set of different emails for same domain address", () => {
        jest.setTimeout(30000)
        return checkForDomain({
            "i.ua": [
                "todoruk",
                "dimitriy86",
                "luksor55",
                "ray-lea",
                "yashka444a",
                "atn-55",
                "fruittella",
                "andruha",
                "aligator_xxx",
                "lolita63",
            ],
            "yandex.ua": [
                "mogilnaia.l",
                "ninakosak1",
                "ustasnovik",
                "wowasport",
                "dudnichenko.ira",
                "miss.ruhlevich2012",
                "lesia.gnatush",
                "reklama-tm",
                "geass15",
                "goscha.carpow2013",
                "tecno-plus",
                "yfcnzghelybr",
                "megastar1985",
                "astafieva.nyura",
                "licheha",
            ],
        })
            .then((results: any) =>
                  results.filter((it: any) => it.status === true),
            )
            .then((statusTrue: any[]) => assert(statusTrue.length === 4))
    })

    it.only("checkForDomain: huge set of different emails for same domain address", () => {
        jest.setTimeout(3600 * 1000) // allowing one hour
        const iUA = require("./i_ua.json")
        return checkForDomain(iUA)
            .then((results: any) =>
                  results.filter((it: any) => it.status === true),
            )
            .then((statusTrue: any[]) => {
                assert(statusTrue.length === 14604)
                fs.writeFileSync(
                    "i_ua_statusTrue.json",
                    JSON.stringify(statusTrue),
                    "UTF-8",
                )
                return statusTrue
            })
    })
})
