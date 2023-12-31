/* This file is part of Tryton.  The COPYRIGHT file at the top level of
   this repository contains the full copyright notices and license terms. */
(function() {
    'use strict';

    Sao.Action = {
        report_blob_url: undefined
    };

    Sao.Action.exec_action = function(action, data, context) {
        if (!context) {
            context = {};
        } else {
            context = jQuery.extend({}, context);
        }
        var session = Sao.Session.current_session;
        if (!('date_format' in context)) {
            if (session.context.locale && session.context.locale.date) {
                context.date_format = session.context.locale.date;
            }
        }
        if (data === undefined) {
            data = {};
        } else {
            data = jQuery.extend({}, data);
        }

        delete context.active_id;
        delete context.active_ids;
        delete context.active_model;

        function add_name_suffix(name){
            if (!data.model || !data.ids) {
                return jQuery.when(name);
            }
            var max_records = 5;
            var ids = data.ids.slice(0, max_records);
            return Sao.rpc({
                'method': 'model.' + data.model + '.read',
                'params': [ids, ['rec_name'], context]
            }, Sao.Session.current_session).then(function(result) {
                var name_suffix = result.map(function(record){
                    return record.rec_name;
                }).join(Sao.i18n.gettext(', '));

                if (data.ids.length > max_records) {
                    name_suffix += Sao.i18n.gettext(',\u2026');
                }
                return Sao.i18n.gettext('%1 (%2)', name, name_suffix);
            });
        }
        data.action_id = action.id;
        var params = {};
        var name_prm;
        switch (action.type) {
            case 'ir.action.act_window':
                params.view_ids = [];
                params.mode = null;
                if (!jQuery.isEmptyObject(action.views)) {
                    params.view_ids = [];
                    params.mode = [];
                    action.views.forEach(function(x) {
                        params.view_ids.push(x[0]);
                        params.mode.push(x[1]);
                    });
                } else if (!jQuery.isEmptyObject(action.view_id)) {
                    params.view_ids = [action.view_id[0]];
                }

                if (action.pyson_domain === undefined) {
                    action.pyson_domain = '[]';
                }
                var ctx = {
                    active_model: data.model || null,
                    active_id: data.id || null,
                    active_ids: data.ids
                };
                ctx = jQuery.extend(ctx, session.context);
                ctx._user = session.user_id;
                var decoder = new Sao.PYSON.Decoder(ctx);
                params.context = jQuery.extend(
                    {}, context,
                    decoder.decode( action.pyson_context || '{}'));
                ctx = jQuery.extend(ctx, params.context);
                ctx = jQuery.extend(ctx, context);

                ctx.context = ctx;
                decoder = new Sao.PYSON.Decoder(ctx);
                params.domain = decoder.decode(action.pyson_domain);
                params.order = decoder.decode(action.pyson_order);
                params.search_value = decoder.decode(
                    action.pyson_search_value || '[]');
                params.tab_domain = [];
                action.domains.forEach(function(element, index) {
                    params.tab_domain.push(
                        [element[0], decoder.decode(element[1]), element[2]]);
                });
                name_prm = jQuery.when(action.name);
                params.model = action.res_model || data.res_model;
                params.res_id = action.res_id || data.res_id;
                params.context_model = action.context_model;
                params.limit = action.limit;
                params.icon = action['icon.rec_name'] || '';

                if ((action.keyword || '') === 'form_relate') {
                    name_prm = add_name_suffix(action.name);
                }
                name_prm.then(function(name) {
                    params.name = name;
                    Sao.Tab.create(params);
                });
                return;
            case 'ir.action.wizard':
                params.action = action.wiz_name;
                params.data = data;
                params.context = context;
                params.window = action.window;
                name_prm = jQuery.when(action.name);
                if ((action.keyword || 'form_action') === 'form_action') {
                    name_prm = add_name_suffix(action.name);
                }
                name_prm.done(function(name) {
                    params.name = name;
                    Sao.Wizard.create(params);
                });
                return;
            case 'ir.action.report':
                params.name = action.report_name;
                params.data = data;
                params.direct_print = action.direct_print;
                params.email_print = action.email_print;
                params.email = action.email;
                params.context = context;
                Sao.Action.exec_report(params);
                return;
            case 'ir.action.url':
                window.open(action.url, '_blank');
                return;
        }
    };

    Sao.Action.exec_keyword = function(keyword, data, context, warning,
            alwaysask)
    {
        if (warning === undefined) {
            warning = true;
        }
        if (alwaysask === undefined) {
            alwaysask = false;
        }
        var actions = [];
        var model_id = data.id;
        var args = {
            'method': 'model.' + 'ir.action.keyword.get_keyword',
            'params': [keyword, [data.model, model_id], {}]
        };
        var prm = Sao.rpc(args, Sao.Session.current_session);
        var exec_action = function(actions) {
            var keyact = {};
            for (var i in actions) {
                var action = actions[i];
                keyact[action.name.replace(/_/g, '')] = action;
            }
            var prm = Sao.common.selection(
                    Sao.i18n.gettext('Select your action'),
                    keyact, alwaysask);
            return prm.then(function(action) {
                Sao.Action.exec_action(action, data, context);
            }, function() {
                if (jQuery.isEmptyObject(keyact) && warning) {
                    alert(Sao.i18n.gettext('No action defined.'));
                }
            });
        };
        return prm.pipe(exec_action);
    };

    Sao.Action.exec_report = function(attributes) {
        if (!attributes.context) {
            attributes.context = {};
        }
        if (!attributes.email) {
            attributes.email = {};
        }
        var data = jQuery.extend({}, attributes.data);
        var context = jQuery.extend({}, Sao.Session.current_session.context);
        jQuery.extend(context, attributes.context);
        context.direct_print = attributes.direct_print;
        context.email_print = attributes.email_print;
        context.email = attributes.email;

        var prm = Sao.rpc({
            'method': 'report.' + attributes.name + '.execute',
            'params': [data.ids || [], data, context]
        }, Sao.Session.current_session);
        prm.done(function(result) {
            var report_type = result[0];
            var data = result[1];
            var print = result[2];
            var name = result[3];

            // TODO direct print
            var blob = new Blob([data],
                {type: Sao.common.guess_mimetype(report_type)});
            var blob_url = window.URL.createObjectURL(blob);
            if (Sao.Action.report_blob_url) {
                window.URL.revokeObjectURL(Sao.Action.report_blob_url);
            }
            Sao.Action.report_blob_url = blob_url;
            window.open(blob_url);
        });
    };

    Sao.Action.execute = function(id, data, type, context) {
        if (!type) {
            Sao.rpc({
                'method': 'model.ir.action.read',
                'params': [[id], ['type'], context]
            }, Sao.Session.current_session).done(function(result) {
                Sao.Action.execute(id, data, result[0].type, context);
            });
        } else {
            Sao.rpc({
                'method': 'model.' + type + '.search_read',
                'params': [[['action', '=', id]], 0, 1, null, null, context]
            }, Sao.Session.current_session).done(function(result) {
                Sao.Action.exec_action(result[0], data, context);
            });
        }
    };

    Sao.Action.evaluate = function(action, atype, record) {
        action = jQuery.extend({}, action);
        var email = {};
        if ('pyson_email' in action) {
            email = record.expr_eval(action.pyson_email);
            if (jQuery.isEmptyObject(email)) {
                email = {};
            }
        }
        if (!('subject' in email)) {
            email.subject = action.name.replace(/_/g, '');
        }
        action.email = email;
        return action;
    };
}());
