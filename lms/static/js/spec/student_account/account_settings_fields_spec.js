define(['backbone',
        'jquery',
        'underscore',
        'edx-ui-toolkit/js/utils/spec-helpers/ajax-helpers',
        'common/js/spec_helpers/template_helpers',
        'js/views/fields',
        'js/spec/views/fields_helpers',
        'js/spec/student_account/account_settings_fields_helpers',
        'js/student_account/views/account_settings_fields',
        'js/student_account/models/user_account_model',
        'string_utils'],
    function (Backbone, $, _, AjaxHelpers, TemplateHelpers, FieldViews, FieldViewsSpecHelpers,
              AccountSettingsFieldViewSpecHelpers, AccountSettingsFieldViews) {
        'use strict';

        describe("edx.AccountSettingsFieldViews", function () {

            var requests,
                timerCallback;

            beforeEach(function () {
                timerCallback = jasmine.createSpy('timerCallback');
                jasmine.clock().install();
            });

            afterEach(function() {
                jasmine.clock().uninstall();
            });

            it("sends request to reset password on clicking link in PasswordFieldView", function() {
                requests = AjaxHelpers.requests(this);

                var fieldData = FieldViewsSpecHelpers.createFieldData(AccountSettingsFieldViews.PasswordFieldView, {
                    linkHref: '/password_reset',
                    emailAttribute: 'email'
                });

                var view = new AccountSettingsFieldViews.PasswordFieldView(fieldData).render();
                view.$('.u-field-value > button').click();
                AjaxHelpers.expectRequest(requests, 'POST', '/password_reset', "email=legolas%40woodland.middlearth");
                AjaxHelpers.respondWithJson(requests, {"success": "true"});
                FieldViewsSpecHelpers.expectMessageContains(
                    view,
                    "We've sent a message to legolas@woodland.middlearth. " +
                    "Click the link in the message to reset your password."
                );
            });

            it("update time zone dropdown after country dropdown changes", function () {
                requests = AjaxHelpers.requests(this);
                var selector = '.u-field-value > select';
                var groups = '.u-field-value > select > optgroup';
                var groupOptions = '.u-field-value > select > optgroup > option';
                var normalOptions = '.u-field-value > select > option';

                var timeZoneData = FieldViewsSpecHelpers.createFieldData(AccountSettingsFieldViews.TimeZoneFieldView, {
                    valueAttribute: 'time_zone',
                    options: FieldViewsSpecHelpers.SELECT_OPTIONS,
                    persistChanges: true,
                    required: true
                });

                var countryData = FieldViewsSpecHelpers.createFieldData(AccountSettingsFieldViews.DropdownFieldView, {
                    valueAttribute: 'country',
                    options: [['KY', "Cayman Islands"], ['CA', 'Canada'], ['GY', 'Guyana']],
                    persistChanges: true
                });

                var timeZoneView = new AccountSettingsFieldViews.TimeZoneFieldView(timeZoneData).render();
                var countryView = new AccountSettingsFieldViews.DropdownFieldView(countryData).render();

                timeZoneView.listenToCountryView(countryView);

                expect(timeZoneView.$(groups).length).toBe(0);
                expect(timeZoneView.$(normalOptions).length).toBe(4);
                expect(timeZoneView.$(normalOptions)[0].value).toBe('');

                var data = {'country': countryData.options[2][0]};
                countryView.$(selector).val(data[countryData.valueAttribute]).change();

                FieldViewsSpecHelpers.expectAjaxRequestWithData(requests, data);
                AjaxHelpers.respondWithJson(requests, {"success": "true"});

                AjaxHelpers.expectRequest(
                    requests,
                    'GET',
                    '/user_api/v1/preferences/time_zones/?country_code=GY'
                );
                AjaxHelpers.respondWithJson(requests, [
                    {'time_zone': 'America/Guyana', 'description': 'America/Guyana (ECT, UTC-0500)'},
                    {'time_zone': 'Pacific/Kosrae', 'description': 'Pacific/Kosrae (KOST, UTC+1100)'}
                ]);

                expect(timeZoneView.$(groups).length).toBe(2);
                expect(timeZoneView.$(groupOptions).length).toBe(5);
                expect(timeZoneView.$(groupOptions)[0].value).toBe('America/Guyana');
            });

            it("sends request to /i18n/setlang/ after changing language preference in LanguagePreferenceFieldView", function() {
                requests = AjaxHelpers.requests(this);

                var selector = '.u-field-value > select';
                var fieldData = FieldViewsSpecHelpers.createFieldData(AccountSettingsFieldViews.DropdownFieldView, {
                    valueAttribute: 'language',
                    options: FieldViewsSpecHelpers.SELECT_OPTIONS,
                    persistChanges: true
                });

                var view = new AccountSettingsFieldViews.LanguagePreferenceFieldView(fieldData).render();

                var data = {'language': FieldViewsSpecHelpers.SELECT_OPTIONS[2][0]};
                view.$(selector).val(data[fieldData.valueAttribute]).change();
                FieldViewsSpecHelpers.expectAjaxRequestWithData(requests, data);
                AjaxHelpers.respondWithNoContent(requests);

                AjaxHelpers.expectRequest(
                    requests,
                    'POST',
                    '/i18n/setlang/',
                    'language=' + data[fieldData.valueAttribute]
                );
                AjaxHelpers.respondWithNoContent(requests);
                FieldViewsSpecHelpers.expectMessageContains(view, "Your changes have been saved.");

                data = {'language': FieldViewsSpecHelpers.SELECT_OPTIONS[1][0]};
                view.$(selector).val(data[fieldData.valueAttribute]).change();
                FieldViewsSpecHelpers.expectAjaxRequestWithData(requests, data);
                AjaxHelpers.respondWithNoContent(requests);

                AjaxHelpers.expectRequest(
                    requests,
                    'POST',
                    '/i18n/setlang/',
                    'language=' + data[fieldData.valueAttribute]
                );
                AjaxHelpers.respondWithError(requests, 500);
                FieldViewsSpecHelpers.expectMessageContains(
                    view,
                    "You must sign out and sign back in before your language changes take effect."
                );
            });

            it("reads and saves the value correctly for LanguageProficienciesFieldView", function() {
                requests = AjaxHelpers.requests(this);

                var selector = '.u-field-value > select';
                var fieldData = FieldViewsSpecHelpers.createFieldData(AccountSettingsFieldViews.DropdownFieldView, {
                    valueAttribute: 'language_proficiencies',
                    options: FieldViewsSpecHelpers.SELECT_OPTIONS,
                    persistChanges: true
                });
                fieldData.model.set({'language_proficiencies': [{'code': FieldViewsSpecHelpers.SELECT_OPTIONS[0][0]}]});

                var view = new AccountSettingsFieldViews.LanguageProficienciesFieldView(fieldData).render();

                expect(view.modelValue()).toBe(FieldViewsSpecHelpers.SELECT_OPTIONS[0][0]);

                var data = {'language_proficiencies': [{'code': FieldViewsSpecHelpers.SELECT_OPTIONS[1][0]}]};
                view.$(selector).val(FieldViewsSpecHelpers.SELECT_OPTIONS[1][0]).change();
                FieldViewsSpecHelpers.expectAjaxRequestWithData(requests, data);
                AjaxHelpers.respondWithNoContent(requests);
            });

            it("correctly links and unlinks from AuthFieldView", function() {
                requests = AjaxHelpers.requests(this);

                var fieldData = FieldViewsSpecHelpers.createFieldData(FieldViews.LinkFieldView, {
                    title: 'Yet another social network',
                    helpMessage: '',
                    valueAttribute: 'auth-yet-another',
                    connected: true,
                    acceptsLogins: 'true',
                    connectUrl: 'yetanother.com/auth/connect',
                    disconnectUrl: 'yetanother.com/auth/disconnect'
                });
                var view = new AccountSettingsFieldViews.AuthFieldView(fieldData).render();

                AccountSettingsFieldViewSpecHelpers.verifyAuthField(view, fieldData, requests);
            });
        });
    });
