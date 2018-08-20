module Main where

import Prelude
import Data.Function.Uncurried (Fn2, runFn2)
import Effect (Effect)
import Effect.Console (log)
import Test.Spec (describe, it)
import Test.Spec.Assertions (shouldEqual, shouldNotEqual)
import Test.Spec.Reporter.Console (consoleReporter)
import Test.Spec.Runner (run)

foreign import mkHtmlForStarredAssets :: Fn2 String String String
foreign import foo :: Fn2 String String String

foo_ :: String -> String -> String
foo_ = runFn2 foo

mkHtmlForStarredAssets_ :: String -> String -> String
mkHtmlForStarredAssets_ = runFn2 mkHtmlForStarredAssets

main :: Effect Unit
main = run [consoleReporter] do
    describe "Interface Dashboard" do
      it "Asset Dashboard - Foo should return 'foo'." do
         foo_ "" "" `shouldEqual` "foo"
      it "Asset Dashboard - Foo should not return 'hoi'." do
         foo_ "" "" `shouldNotEqual` "bar"
